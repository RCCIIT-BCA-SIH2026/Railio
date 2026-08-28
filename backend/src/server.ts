import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';
import { simulationEngine } from './services/simulationEngine';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  if (req.path !== '/health') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Socket.IO Setup
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('subscribe_train', (trainNumber) => {
    socket.join(`train_${trainNumber}`);
    console.log(`[Socket.IO] ${socket.id} subscribed to train_${trainNumber}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Mount Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'RailSathi AI Railway Intelligence Platform',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Root welcome
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to RailSathi API Gateway - Predict • Protect • Connect',
    docs: '/api/admin/dashboard',
    health: '/health',
  });
});

// Start Simulation Engine and Server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚆 RailSathi Backend running on http://localhost:${PORT}`);
  console.log(`⚡ Socket.IO real-time channel active`);
  console.log(`=======================================================`);
  simulationEngine.init(io);
});
