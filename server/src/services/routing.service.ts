import axios from 'axios';

interface Waypoint {
  lat: number;
  lng: number;
}

export const calculateOptimizedRoute = async (
  origin: Waypoint,
  destination: Waypoint,
  via: Waypoint[] = [],
  transportMode: string = 'driving',
  routingMode: string = 'fast'
) => {
  try {
    // We use the free public OSRM API. Profile: driving
    const coordinates = [
      `${origin.lng},${origin.lat}`,
      ...via.map(v => `${v.lng},${v.lat}`),
      `${destination.lng},${destination.lat}`
    ].join(';');

    const url = `http://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

    const response = await axios.get(url);
    const data = response.data;

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = data.routes[0];

    // Format response to be compatible with frontend expectations
    return {
      routes: [
        {
          geometry: route.geometry,
          sections: [
            {
              summary: {
                duration: route.duration,
                length: route.distance
              }
            }
          ]
        }
      ]
    };
  } catch (error: any) {
    console.error('Error calculating OSRM route:', error.response?.data || error.message);
    throw new Error('Failed to calculate route');
  }
};
