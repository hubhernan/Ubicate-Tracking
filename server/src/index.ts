import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import geofenceRoutes from './routes/geofence.routes';
import historyRoutes from './routes/history.routes';
import routingRoutes from './routes/routing.routes';
import assetRoutes from './routes/asset.routes';
import authRoutes from './routes/auth.routes';
import { checkPosition } from './controllers/geofence.controller';
import { savePosition } from './services/position.service';
import { getAssetConfig } from './controllers/asset.controller';
import { authenticateJWT } from './middleware/auth.middleware';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/geofences', authenticateJWT, geofenceRoutes);
app.use('/api/history', authenticateJWT, historyRoutes);
app.use('/api/routing', authenticateJWT, routingRoutes);
app.use('/api/assets', authenticateJWT, assetRoutes);

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Ubicate Server is running' });
});

// WebSocket logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('update-location', async (data) => {
    // Broadcast to others (for real-time tracking)
    console.log('Location update from', socket.id, data);
    
    // Check geofences
    if (data.lat && data.lng) {
      // Persist position (using socket.id as temporary asset_id)
      await savePosition(
        socket.id, 
        data.lat, 
        data.lng, 
        data.speed || 0, 
        data.heading || 0, 
        data.accuracy || 0
      );

      // Check Speed Limit
      const config = await getAssetConfig(socket.id);
      if (config && data.speed > config.speed_limit) {
        socket.emit('speeding-alert', { 
          speed: data.speed, 
          limit: config.speed_limit,
          mode: config.driving_mode 
        });
      }

      const activeGeofences = await checkPosition(socket.id, data.lat, data.lng);
      if (activeGeofences.length > 0) {
        console.log(`Asset ${socket.id} is inside:`, activeGeofences.map(g => g.name).join(', '));
        socket.emit('geofence-breach', { geofences: activeGeofences });
      }
    }

    socket.broadcast.emit('location-updated', {
      id: socket.id,
      ...data
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
