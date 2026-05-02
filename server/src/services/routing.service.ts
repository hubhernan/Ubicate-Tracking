import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const HERE_API_KEY = process.env.HERE_API_KEY;
const ROUTING_URL = 'https://router.hereapi.com/v8/routes';

interface Waypoint {
  lat: number;
  lng: number;
}

export const calculateOptimizedRoute = async (
  origin: Waypoint,
  destination: Waypoint,
  via: Waypoint[] = [],
  transportMode: string = 'car',
  routingMode: string = 'fast'
) => {
  try {
    const params: any = {
      transportMode,
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      return: 'polyline,summary,actions,instructions',
      apikey: HERE_API_KEY,
    };

    if (via.length > 0) {
      params.via = via.map(p => `${p.lat},${p.lng}`).join('|');
    }

    // routingMode: 'fast' or 'short'
    // For optimization (v8 doesn't have a direct "reorder" like v7, but we can use the Waypoint Sequence API if needed)
    // For now, we'll implement standard multi-stop routing.
    
    const response = await axios.get(ROUTING_URL, { params });
    return response.data;
  } catch (error: any) {
    console.error('Error calculating route:', error.response?.data || error.message);
    throw new Error('Failed to calculate route');
  }
};
