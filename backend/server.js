const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Ensure we always load the backend/.env file regardless of where the server is started from
require('dotenv').config({
  path: path.resolve(__dirname, '.env')
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Track online sockets per user for direct chat notifications
const userSocketMap = new Map();

const getUserKey = (userId) => {
  if (!userId && userId !== 0) return null;
  return String(userId);
};

const addUserSocket = (userId, socket) => {
  const key = getUserKey(userId);
  if (!key) return;

  let socketSet = userSocketMap.get(key);
  if (!socketSet) {
    socketSet = new Set();
    userSocketMap.set(key, socketSet);
  }
  socketSet.add(socket.id);
  socket.data.userId = key;
};

const removeUserSocket = (socket) => {
  const key = getUserKey(socket?.data?.userId);
  if (!key) return;

  const socketSet = userSocketMap.get(key);
  if (!socketSet) return;

  socketSet.delete(socket.id);
  if (socketSet.size === 0) {
    userSocketMap.delete(key);
  }
};

const emitToUser = (userId, eventName, payload, excludeSocketId = null) => {
  const key = getUserKey(userId);
  if (!key) return;

  const socketIds = userSocketMap.get(key);
  if (!socketIds) return;

  socketIds.forEach((id) => {
    if (excludeSocketId && id === excludeSocketId) {
      return;
    }
    const targetSocket = io.sockets.sockets.get(id);
    if (targetSocket) {
      targetSocket.emit(eventName, payload);
    }
  });
};

const PORT = process.env.PORT || 4001;

// Import routes
const authRoutes = require('./routes/auth');
const voteRoutes = require('./routes/votes');
const { supabase } = require('./config/supabase');
const UserMatchingService = require('./services/UserMatchingService');
const ConversationTopicService = require('./services/ConversationTopicService');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// User Profile API endpoints
app.get('/api/user/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in user profile endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/user/profile', async (req, res) => {
  try {
    console.log('🔍 Profile update request received:', {
      headers: req.headers,
      body: req.body
    });

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No authorization token provided');
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 Token extracted, validating with Supabase...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log('❌ Invalid token:', authError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('✅ User authenticated:', { id: user.id, email: user.email });

    const { nickname, major, hobby, gender, classes, favorite_foods, bio, profile_image_url } = req.body;
    
    console.log('📝 Profile data to update:', {
      nickname,
      major,
      hobby,
      gender,
      classes,
      favorite_foods,
      bio,
      profile_image_url
    });

    const updateData = {
      nickname,
      major,
      hobby,
      gender,
      classes,
      favorite_foods,
      bio,
      profile_image_url,
      is_profile_complete: true,
      updated_at: new Date().toISOString()
    };

    console.log('💾 Updating database with data:', updateData);

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating user profile:', error);
      return res.status(500).json({ error: 'Failed to update user profile', details: error.message });
    }

    console.log('✅ Profile updated successfully:', data);
    res.json(data);
  } catch (error) {
    console.error('❌ Error in user profile update endpoint:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Buildings API endpoint
app.get('/api/buildings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('is_active', true)
      .order('id');

    if (error) {
      console.error('Error fetching buildings:', error);
      return res.status(500).json({ error: 'Failed to fetch buildings' });
    }

    // Transform data to match frontend format
    const buildings = data.map(building => ({
      id: building.id,
      name: building.name,
      lat: parseFloat(building.latitude),
      lng: parseFloat(building.longitude),
      radius: building.radius,
      owner: building.owner,
      description: building.description
    }));

    res.json(buildings);
  } catch (error) {
    console.error('Error in buildings API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'BYU Homecoming Hackathon Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      votes: '/api/votes/*'
    }
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Vote routes
app.use('/api/votes', voteRoutes);

// Matching API endpoints
const matchingService = new UserMatchingService();
const conversationService = new ConversationTopicService();

// 매칭된 유저들 조회
app.get('/api/matching/matched-users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const matchedUsers = await matchingService.getMatchedUsersProfiles(user.id);
    res.json(matchedUsers);
  } catch (error) {
    console.error('Error fetching matched users:', error);
    res.status(500).json({ error: 'Failed to fetch matched users' });
  }
});

// 새로운 매칭 실행
app.post('/api/matching/find-matches', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const matchingResult = await matchingService.findMatches(token);
    res.json(matchingResult);
  } catch (error) {
    console.error('Error running matching:', error);
    res.status(500).json({ error: 'Failed to run matching' });
  }
});

// 특정 유저 상세 프로필 조회
app.get('/api/matching/user/:userId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { userId } = req.params;
    const userProfile = await matchingService.getUserDetailedProfile(userId);
    res.json(userProfile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// 대화 주제 생성
app.post('/api/conversation/topics', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { targetUserId, currentUserProfile } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    // 대상 사용자 프로필 조회
    const targetUserProfile = await matchingService.getUserDetailedProfile(targetUserId);
    if (!targetUserProfile.success) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    // 대화 주제 생성
    const conversationTopics = await conversationService.generateConversationTopics(
      targetUserProfile.profile,
      currentUserProfile
    );

    res.json(conversationTopics);
  } catch (error) {
    console.error('Error generating conversation topics:', error);
    res.status(500).json({ error: 'Failed to generate conversation topics' });
  }
});

// 특정 카테고리별 대화 주제 생성
app.post('/api/conversation/topics/:category', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { category } = req.params;
    const { targetUserId } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    // 대상 사용자 프로필 조회
    const targetUserProfile = await matchingService.getUserDetailedProfile(targetUserId);
    if (!targetUserProfile.success) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    // 카테고리별 대화 주제 생성
    const categoryTopics = await conversationService.generateCategoryTopics(
      targetUserProfile.profile,
      category
    );

    res.json(categoryTopics);
  } catch (error) {
    console.error('Error generating category topics:', error);
    res.status(500).json({ error: 'Failed to generate category topics' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    message: 'A server error occurred.'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint was not found.'
  });
});

// Socket.IO Chat functionality
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  const getDirectRoomName = (conversationId) => {
    if (conversationId === null || conversationId === undefined) return null;
    return `direct-${String(conversationId)}`;
  };

  const ensureDirectChatStore = () => {
    if (!socket.data.directChats) {
      socket.data.directChats = new Set();
    }
  };
  // User nickname registration
  socket.on('setNickname', (payload) => {
    let nickname = 'Anonymous';
    let userId = null;

    if (payload && typeof payload === 'object') {
      nickname = payload.nickname || payload.name || payload.displayName || nickname;
      userId = payload.userId || payload.id || null;
    } else if (typeof payload === 'string') {
      nickname = payload || nickname;
    }

    nickname = nickname?.toString().trim() || 'Anonymous';
    socket.data.nickname = nickname;

    if (userId) {
      removeUserSocket(socket);
      addUserSocket(userId, socket);
    } else if (socket.data.userId && (!payload || typeof payload !== 'object')) {
      removeUserSocket(socket);
      socket.data.userId = null;
    }

    console.log(`🎭 ${socket.id} nickname: ${nickname}${userId ? ` (userId: ${userId})` : ''}`);
    
    // Join general chat room
    socket.join('general-chat');
    
    // Broadcast user count update for general chat
    const generalRoomSize = io.sockets.adapter.rooms.get('general-chat')?.size || 0;
    io.to('general-chat').emit('userCountUpdate', {
      spotId: 'general',
      userCount: generalRoomSize
    });
  });

  // Join a specific spot chat room
  socket.on('joinSpotChat', (spotData) => {
    const { spotId, spotName } = spotData;
    const nickname = socket.data.nickname || 'Anonymous';
    
    // Leave previous spot room if any
    if (socket.data.currentSpot) {
      socket.leave(`spot-${socket.data.currentSpot}`);
    }
    
    // Join new spot room
    socket.join(`spot-${spotId}`);
    socket.data.currentSpot = spotId;
    
    console.log(`📍 ${nickname} joined spot chat: ${spotName} (${spotId})`);
    
    // Get current room size
    const roomSize = io.sockets.adapter.rooms.get(`spot-${spotId}`)?.size || 0;
    
    // Broadcast to the specific spot room
    io.to(`spot-${spotId}`).emit('chatMessage', {
      user: 'System',
      message: `${nickname} joined ${spotName} chat.`,
      time: new Date().toLocaleTimeString(),
      type: 'system',
      spotId: spotId
    });
    
    // Broadcast user count update
    io.to(`spot-${spotId}`).emit('userCountUpdate', {
      spotId: spotId,
      userCount: roomSize
    });
  });

  // Leave spot chat room
  socket.on('leaveSpotChat', () => {
    const nickname = socket.data.nickname || 'Anonymous';
    const currentSpot = socket.data.currentSpot;
    
    if (currentSpot) {
      socket.leave(`spot-${currentSpot}`);
      
      // Get updated room size
      const roomSize = io.sockets.adapter.rooms.get(`spot-${currentSpot}`)?.size || 0;
      
      // Broadcast leave message to the spot room
      io.to(`spot-${currentSpot}`).emit('chatMessage', {
        user: 'System',
        message: `${nickname} left the spot chat.`,
        time: new Date().toLocaleTimeString(),
        type: 'system',
        spotId: currentSpot
      });
      
      // Broadcast user count update
      io.to(`spot-${currentSpot}`).emit('userCountUpdate', {
        spotId: currentSpot,
        userCount: roomSize
      });
      
      socket.data.currentSpot = null;
      console.log(`📍 ${nickname} left spot chat`);
    }
  });

  // Message sending to current spot
  socket.on('chatMessage', (msg) => {
    const user = socket.data.nickname || 'Anonymous';
    const currentSpot = socket.data.currentSpot;
    
    if (!currentSpot) {
      socket.emit('error', { message: 'You are not in any spot chat room.' });
      return;
    }
    
    const payload = {
      user,
      message: msg,
      time: new Date().toLocaleTimeString(),
      type: 'user',
      spotId: currentSpot
    };
    
    // Send message only to the current spot room
    io.to(`spot-${currentSpot}`).emit('chatMessage', payload);
    console.log(`💬 [Spot ${currentSpot}] ${user}: ${msg}`);
  });

  // Direct chat: join conversation
  socket.on('joinDirectChat', (payload = {}) => {
    const { conversationId, participants = {}, notifyPartner = true, metadata = {} } = payload;
    const roomName = getDirectRoomName(conversationId);

    if (!roomName) {
      socket.emit('directError', { message: 'Invalid conversation id.' });
      return;
    }

    socket.join(roomName);
    ensureDirectChatStore();
    socket.data.directChats.add(roomName);

    if (participants.fromUserId) {
      removeUserSocket(socket);
      socket.data.userId = participants.fromUserId;
      addUserSocket(participants.fromUserId, socket);
    }

    const nickname = participants.fromNickname || socket.data.nickname || 'Anonymous';
    const timestamp = new Date().toLocaleTimeString();
    const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;

    io.to(roomName).emit('directMessage', {
      conversationId,
      senderId: 'system',
      senderNickname: 'System',
      message: `${nickname} joined the chat.`,
      time: timestamp,
      type: 'system'
    });

    io.to(roomName).emit('directUserCountUpdate', {
      conversationId,
      userCount: roomSize
    });

    if (notifyPartner && participants.toUserId && participants.fromUserId !== participants.toUserId) {
      const invitePayload = {
        conversationId,
        fromUser: {
          id: participants.fromUserId,
          nickname: nickname,
          profile_image_url: participants.fromProfileImage || null,
          major: participants.fromMajor || null,
          hobby: participants.fromHobby || null
        },
        toUserId: participants.toUserId,
        createdAt: new Date().toISOString(),
        metadata
      };

      emitToUser(participants.toUserId, 'directChatInvite', invitePayload, socket.id);
    }
  });

  // Direct chat: leave conversation
  socket.on('leaveDirectChat', (payload = {}) => {
    const { conversationId } = payload;
    const roomName = getDirectRoomName(conversationId);

    if (!roomName || !socket.data.directChats || !socket.data.directChats.has(roomName)) {
      return;
    }

    socket.leave(roomName);
    socket.data.directChats.delete(roomName);

    const nickname = socket.data.nickname || 'Anonymous';
    const timestamp = new Date().toLocaleTimeString();
    const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;

    io.to(roomName).emit('directMessage', {
      conversationId,
      senderId: 'system',
      senderNickname: 'System',
      message: `${nickname} left the chat.`,
      time: timestamp,
      type: 'system'
    });

    io.to(roomName).emit('directUserCountUpdate', {
      conversationId,
      userCount: roomSize
    });
  });

  // Direct chat: send message
  socket.on('sendDirectMessage', (payload = {}) => {
    const { conversationId, message, senderId, senderNickname, recipientId, senderProfileImage } = payload;
    const roomName = getDirectRoomName(conversationId);

    if (!roomName) {
      socket.emit('directError', { message: 'Invalid conversation id.' });
      return;
    }

    if (!socket.data.directChats || !socket.data.directChats.has(roomName)) {
      socket.emit('directError', { message: 'You are not in this conversation.' });
      return;
    }

    if (typeof message !== 'string' || message.trim() === '') {
      return;
    }

    const preparedMessage = {
      conversationId,
      senderId: senderId || socket.data.userId || socket.id,
      senderNickname: senderNickname || socket.data.nickname || 'Anonymous',
      message: message.trim(),
      time: new Date().toLocaleTimeString(),
      type: 'user'
    };

    io.to(roomName).emit('directMessage', preparedMessage);
    console.log(`💬 [Direct ${conversationId}] ${preparedMessage.senderNickname}: ${preparedMessage.message}`);

    const notificationPayload = {
      conversationId,
      fromUser: {
        id: preparedMessage.senderId,
        nickname: preparedMessage.senderNickname,
        profile_image_url: senderProfileImage || null
      },
      message: preparedMessage.message,
      time: preparedMessage.time,
      type: 'user'
    };

    if (recipientId) {
      emitToUser(recipientId, 'directMessageNotification', notificationPayload);
    }

    if (preparedMessage.senderId) {
      emitToUser(preparedMessage.senderId, 'directMessageNotification', {
        ...notificationPayload,
        toUserId: recipientId || null,
        isSelf: true
      }, socket.id);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const nickname = socket.data.nickname;
    const currentSpot = socket.data.currentSpot;
    console.log(`❌ User disconnected: ${socket.id}`);
    
    if (nickname) {
      // Update general chat room count
      const generalRoomSize = io.sockets.adapter.rooms.get('general-chat')?.size || 0;
      io.to('general-chat').emit('userCountUpdate', {
        spotId: 'general',
        userCount: generalRoomSize
      });
      
      if (currentSpot) {
        // Get updated room size after disconnect
        const roomSize = io.sockets.adapter.rooms.get(`spot-${currentSpot}`)?.size || 0;
        
        io.to(`spot-${currentSpot}`).emit('chatMessage', {
          user: 'System',
          message: `${nickname} left the chat.`,
          time: new Date().toLocaleTimeString(),
          type: 'system',
          spotId: currentSpot
        });
        
        // Broadcast user count update
        io.to(`spot-${currentSpot}`).emit('userCountUpdate', {
          spotId: currentSpot,
          userCount: roomSize
        });
      }
    }

    if (socket.data.directChats && socket.data.directChats.size > 0) {
      const nicknameForDirect = nickname || 'Anonymous';

      for (const roomName of socket.data.directChats) {
        socket.leave(roomName);
        const conversationId = roomName.replace(/^direct-/, '');
        const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;

        io.to(roomName).emit('directMessage', {
          conversationId,
          senderId: 'system',
          senderNickname: 'System',
          message: `${nicknameForDirect} disconnected.`,
          time: new Date().toLocaleTimeString(),
          type: 'system'
        });

        io.to(roomName).emit('directUserCountUpdate', {
          conversationId,
          userCount: roomSize
        });
      }

      socket.data.directChats.clear();
    }

    removeUserSocket(socket);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`Auth endpoints available at: http://localhost:${PORT}/api/auth`);
  console.log(`💬 Chat server ready for connections`);
});
