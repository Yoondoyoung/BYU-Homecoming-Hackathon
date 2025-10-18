const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// Distance calculation function (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

// Get votes for a specific building
router.get('/building/:buildingId', async (req, res) => {
  try {
    const { buildingId } = req.params;

    // Fetch building votes (using Service Role Key to bypass RLS)
    const { data: votes, error } = await supabaseAdmin
      .from('building_votes')
      .select('*')
      .eq('building_id', buildingId);

    if (error) {
      console.error('Error fetching votes:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch votes',
        message: 'Failed to fetch vote results.' 
      });
    }

    // Aggregate vote results
    const voteCounts = {
      option_a: 0,
      option_b: 0,
      total: 0
    };

    votes.forEach(vote => {
      if (vote.vote_option === 'a') voteCounts.option_a++;
      else if (vote.vote_option === 'b') voteCounts.option_b++;
      voteCounts.total++;
    });

    res.json({
      buildingId: parseInt(buildingId),
      votes: voteCounts,
      individualVotes: votes
    });
  } catch (error) {
    console.error('Get votes error:', error);
    res.status(500).json({ 
      error: 'Failed to get votes',
      message: 'An error occurred while fetching votes.' 
    });
  }
});

// Get user's vote for a specific building
router.get('/user/:buildingId', authenticateToken, async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.id;

    const { data: userVote, error } = await supabaseAdmin
      .from('building_votes')
      .select('*')
      .eq('building_id', buildingId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error fetching user vote:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch user vote',
        message: 'Failed to fetch user vote.' 
      });
    }

    res.json({
      hasVoted: !!userVote,
      vote: userVote ? userVote.vote_option : null
    });
  } catch (error) {
    console.error('Get user vote error:', error);
    res.status(500).json({ 
      error: 'Failed to get user vote',
      message: 'An error occurred while fetching user vote.' 
    });
  }
});

// Submit vote with location verification
router.post('/vote', authenticateToken, async (req, res) => {
  try {
    const { buildingId, voteOption, userLatitude, userLongitude } = req.body;
    const userId = req.user.id;

    console.log('🗳️  Vote request received:', { 
      buildingId, 
      voteOption, 
      userId,
      userLocation: { lat: userLatitude, lng: userLongitude }
    });

    // Input validation
    if (!buildingId || !voteOption) {
      console.error('❌ Missing required fields:', { buildingId, voteOption });
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Building ID and vote option are required.' 
      });
    }

    if (!['a', 'b'].includes(voteOption)) {
      return res.status(400).json({ 
        error: 'Invalid vote option',
        message: 'Vote option must be either "a" or "b".' 
      });
    }

    // Check user location
    if (userLatitude === undefined || userLongitude === undefined) {
      return res.status(400).json({ 
        error: 'Location required',
        message: 'Location information is required to vote.' 
      });
    }

    // 🏢 Fetch building information from database
    const { data: building, error: buildingError } = await supabaseAdmin
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .eq('is_active', true)
      .single();

    if (buildingError || !building) {
      console.error('❌ Building not found:', buildingError);
      return res.status(404).json({ 
        error: 'Building not found',
        message: 'Building not found or inactive.' 
      });
    }

    // 📍 Calculate distance between user and building
    const distance = getDistance(
      userLatitude,
      userLongitude,
      parseFloat(building.latitude),
      parseFloat(building.longitude)
    );

    console.log(`📏 Distance check: ${distance.toFixed(2)}m / ${building.radius}m`);

    // ⚠️ Check if user is within range
    if (distance > building.radius) {
      return res.status(403).json({ 
        error: 'Out of range',
        message: `You cannot vote because you are out of range. You must be within ${building.radius}m of ${building.name}. Your current distance is ${Math.round(distance)}m.`,
        distance: Math.round(distance),
        requiredRadius: building.radius
      });
    }

    console.log('✅ User is within range! Distance:', distance.toFixed(2), 'm');

    // Check existing vote (using Service Role Key to bypass RLS)
    const { data: existingVote, error: checkError } = await supabaseAdmin
      .from('building_votes')
      .select('*')
      .eq('building_id', buildingId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing vote:', checkError);
      return res.status(500).json({ 
        error: 'Failed to check existing vote',
        message: 'An error occurred while checking existing vote.' 
      });
    }

    if (existingVote) {
      // Update existing vote (using Service Role Key to bypass RLS)
      const { data: updatedVote, error: updateError } = await supabaseAdmin
        .from('building_votes')
        .update({ 
          vote_option: voteOption,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingVote.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating vote:', updateError);
        return res.status(500).json({ 
          error: 'Failed to update vote',
          message: 'Failed to update vote.' 
        });
      }

      res.json({
        message: 'Vote updated successfully.',
        vote: updatedVote,
        distance: Math.round(distance)
      });
    } else {
      // Create new vote (using Service Role Key to bypass RLS)
      const { data: newVote, error: insertError } = await supabaseAdmin
        .from('building_votes')
        .insert({
          building_id: buildingId,
          user_id: userId,
          vote_option: voteOption,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating vote:', insertError);
        return res.status(500).json({ 
          error: 'Failed to create vote',
          message: 'Failed to create vote.',
          details: insertError.message
        });
      }

      console.log('✅ Vote created successfully:', newVote);
      res.json({
        message: 'Vote submitted successfully.',
        vote: newVote,
        distance: Math.round(distance)
      });
    }
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ 
      error: 'Vote failed',
      message: 'An error occurred while processing vote.' 
    });
  }
});

// Delete vote (cancel vote)
router.delete('/vote/:buildingId', authenticateToken, async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.id;

    const { error } = await supabaseAdmin
      .from('building_votes')
      .delete()
      .eq('building_id', buildingId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting vote:', error);
      return res.status(500).json({ 
        error: 'Failed to delete vote',
        message: 'Failed to cancel vote.' 
      });
    }

    res.json({
      message: 'Vote cancelled successfully.'
    });
  } catch (error) {
    console.error('Delete vote error:', error);
    res.status(500).json({ 
      error: 'Failed to delete vote',
      message: 'An error occurred while cancelling vote.' 
    });
  }
});

// Get all building vote results
router.get('/all', async (req, res) => {
  try {
    const { data: votes, error } = await supabaseAdmin
      .from('building_votes')
      .select('*');

    if (error) {
      console.error('Error fetching all votes:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch all votes',
        message: 'Failed to fetch all vote results.' 
      });
    }

    // Aggregate vote results by building
    const buildingVotes = {};
    votes.forEach(vote => {
      const buildingId = vote.building_id;
      if (!buildingVotes[buildingId]) {
        buildingVotes[buildingId] = {
          option_a: 0,
          option_b: 0,
          total: 0
        };
      }
      
      if (vote.vote_option === 'a') buildingVotes[buildingId].option_a++;
      else if (vote.vote_option === 'b') buildingVotes[buildingId].option_b++;
      buildingVotes[buildingId].total++;
    });

    res.json({
      buildingVotes
    });
  } catch (error) {
    console.error('Get all votes error:', error);
    res.status(500).json({ 
      error: 'Failed to get all votes',
      message: 'An error occurred while fetching all votes.' 
    });
  }
});

module.exports = router;
