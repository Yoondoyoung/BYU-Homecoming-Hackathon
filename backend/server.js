const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 4001;

// Import routes
const authRoutes = require('./routes/auth');

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

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'BYU Homecoming Hackathon Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*'
    }
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

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

  // User nickname registration
  socket.on('setNickname', (nickname) => {
    socket.data.nickname = nickname;
    console.log(`🎭 ${socket.id} nickname: ${nickname}`);
    
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
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`Auth endpoints available at: http://localhost:${PORT}/api/auth`);
  console.log(`💬 Chat server ready for connections`);
});
