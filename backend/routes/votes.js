const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// 건물별 투표 조회
router.get('/building/:buildingId', async (req, res) => {
  try {
    const { buildingId } = req.params;

    // 건물별 투표 결과 조회 (Service Role Key 사용하여 RLS 우회)
    const { data: votes, error } = await supabaseAdmin
      .from('building_votes')
      .select('*')
      .eq('building_id', buildingId);

    if (error) {
      console.error('Error fetching votes:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch votes',
        message: '투표 결과를 가져오는데 실패했습니다.' 
      });
    }

    // 투표 결과 집계
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
      message: '투표 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 사용자의 특정 건물 투표 조회
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

    if (error && error.code !== 'PGRST116') { // PGRST116은 "no rows returned" 에러
      console.error('Error fetching user vote:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch user vote',
        message: '사용자 투표를 가져오는데 실패했습니다.' 
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
      message: '사용자 투표 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 투표하기
router.post('/vote', authenticateToken, async (req, res) => {
  try {
    const { buildingId, voteOption } = req.body;
    const userId = req.user.id;

    console.log('🗳️  Vote request received:', { buildingId, voteOption, userId });

    // 입력 검증
    if (!buildingId || !voteOption) {
      console.error('❌ Missing required fields:', { buildingId, voteOption });
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: '건물 ID와 투표 옵션은 필수입니다.' 
      });
    }

    if (!['a', 'b'].includes(voteOption)) {
      return res.status(400).json({ 
        error: 'Invalid vote option',
        message: '투표 옵션은 a 또는 b만 가능합니다.' 
      });
    }

    // 기존 투표 확인 (Service Role Key 사용하여 RLS 우회)
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
        message: '기존 투표 확인 중 오류가 발생했습니다.' 
      });
    }

    if (existingVote) {
      // 기존 투표 업데이트 (Service Role Key 사용하여 RLS 우회)
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
          message: '투표 업데이트에 실패했습니다.' 
        });
      }

      res.json({
        message: '투표가 업데이트되었습니다.',
        vote: updatedVote
      });
    } else {
      // 새 투표 생성 (Service Role Key 사용하여 RLS 우회)
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
          message: '투표 생성에 실패했습니다.',
          details: insertError.message
        });
      }

      console.log('✅ Vote created successfully:', newVote);
      res.json({
        message: '투표가 완료되었습니다.',
        vote: newVote
      });
    }
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ 
      error: 'Vote failed',
      message: '투표 처리 중 오류가 발생했습니다.' 
    });
  }
});

// 투표 취소
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
        message: '투표 취소에 실패했습니다.' 
      });
    }

    res.json({
      message: '투표가 취소되었습니다.'
    });
  } catch (error) {
    console.error('Delete vote error:', error);
    res.status(500).json({ 
      error: 'Failed to delete vote',
      message: '투표 취소 중 오류가 발생했습니다.' 
    });
  }
});

// 모든 건물의 투표 결과 조회
router.get('/all', async (req, res) => {
  try {
    const { data: votes, error } = await supabaseAdmin
      .from('building_votes')
      .select('*');

    if (error) {
      console.error('Error fetching all votes:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch all votes',
        message: '전체 투표 결과를 가져오는데 실패했습니다.' 
      });
    }

    // 건물별로 투표 결과 집계
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
      message: '전체 투표 조회 중 오류가 발생했습니다.' 
    });
  }
});

module.exports = router;
