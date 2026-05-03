import { useState, useEffect } from 'react';

interface LocationState {
  coords: GeolocationCoordinates | null;
  error: string | null;
  loading: boolean;
}

export const useLocation = (options?: PositionOptions) => {
  const [state, setState] = useState<LocationState>({
    coords: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported', loading: false }));
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      setState({
        coords: position.coords,
        error: null,
        loading: false,
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
    };

    const watcher = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
      ...options
    });

    return () => navigator.geolocation.clearWatch(watcher);
  }, [options]);

  return state;
};
