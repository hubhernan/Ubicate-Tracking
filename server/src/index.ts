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
import groupRoutes from './routes/group.routes';
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
app.use('/api/groups', authenticateJWT, groupRoutes);

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Ubicate Server is running' });
});

// WebSocket logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('update-location', async (data) => {
    // Determine the assetId to use
    const assetId = data.assetId;
    
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assetId);

    // Check geofences and save position only if it's a real asset
    if (data.lat && data.lng && isValidUUID) {
      await savePosition(
        assetId, 
        data.lat, 
        data.lng, 
        data.speed || 0, 
        data.heading || 0, 
        data.accuracy || 0
      );

      // Check Speed Limit
      const config = await getAssetConfig(assetId);
      if (config && data.speed > config.speed_limit) {
        socket.emit('speeding-alert', { 
          speed: data.speed, 
          limit: config.speed_limit,
          mode: config.driving_mode 
        });
      }

      const activeGeofences = await checkPosition(assetId, data.lat, data.lng);
      if (activeGeofences.length > 0) {
        socket.emit('geofence-breach', { geofences: activeGeofences });
      }
    }

    // Always broadcast so ALL clients (including sender) can see it move
    io.emit('location-updated', {
      id: assetId || socket.id,
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
