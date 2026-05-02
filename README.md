# Ubicate: Enterprise Geospatial Tracking Platform

Ubicate is a professional-grade geospatial asset tracking solution designed for logistics, fleet management, and personnel monitoring.

## Features
- **Real-time Tracking**: Live updates of position, speed, and heading.
- **HERE Maps Integration**: Enterprise-grade map rendering and routing.
- **Geospatial Analytics**: PostGIS-powered backend for spatial queries.
- **Modern UI**: Dark-themed, responsive dashboard built with React and Tailwind CSS.
- **Scalable Architecture**: WebSocket-based real-time communication.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Zustand, Socket.io-client.
- **Backend**: Node.js, Express, Socket.io, PostgreSQL, PostGIS.
- **Maps**: HERE Maps JavaScript SDK v3.1.

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL with PostGIS extension
- HERE Maps API Key (Get one at [developer.here.com](https://developer.here.com/))

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. Configure Environment Variables:
   - Copy `server/.env.example` to `server/.env` and fill in your details.
   - Update `client/src/App.tsx` with your `HERE_API_KEY`.

4. Initialize Database:
   - Run the SQL script in `server/src/models/schema.sql` on your PostgreSQL database.

### Running the Application

1. Start the Backend:
   ```bash
   cd server
   npm run dev
   ```

2. Start the Frontend:
   ```bash
   cd client
   npm run dev
   ```

## Project Structure
- `client/`: React application (Frontend)
- `server/`: Node.js API and WebSocket server (Backend)
- `architecture.md`: Detailed system design and cost estimation.
