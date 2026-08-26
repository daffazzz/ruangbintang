const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const apiRoutes = require('./routes/api');
const robloxService = require('./services/robloxService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Attach Socket.IO to Express app for route access
app.set('io', io);

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// API Routes
app.use('/api', apiRoutes);

// Realtime WebSocket Connection Handling
io.on('connection', (socket) => {
  console.log(`[Socket] New Web Client Connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket] Client Disconnected: ${socket.id}`);
  });

  socket.on('request_refresh', () => {
    socket.emit('refresh_triggered', { timestamp: Date.now() });
  });
});

// Periodic background poller to ensure fresh leaderboard updates
setInterval(async () => {
  try {
    const res = await robloxService.getOpenCloudDataStoreEntry('Donation Board // V3 - Data', 'Donations');
    if (res.success && res.data) {
      io.emit('leaderboard_update', {
        type: 'donations',
        data: res.data,
        timestamp: Date.now()
      });
    }
  } catch (e) {
    // Suppress background poll errors
  }
}, 30000);

// Root fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export app for Vercel Serverless
module.exports = app;

// Start Server locally if run directly with `node server.js`
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 RUANG BINTANG PARTY WEB DASHBOARD IS RUNNING!`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🎮 Universe ID: ${process.env.UNIVERSE_ID || '10552714340'}`);
    console.log(`📍 Place ID: ${process.env.PLACE_ID || '86691557621244'}`);
    console.log(`====================================================`);
  });
}
