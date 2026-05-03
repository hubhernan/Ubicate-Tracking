import React, { useEffect, useRef } from 'react';

interface MapProps {
  apiKey: string;
  center?: { lat: number; lng: number };
  zoom?: number;
  geofences?: any[];
  history?: any[];
  routeData?: any;
  assets?: any[];
  selectedAssetId?: string;
  baseLayer?: 'normal' | 'satellite' | 'terrain';
  showTraffic?: boolean;
}

declare global {
  interface Window {
    H: any;
  }
}

const Map: React.FC<MapProps> = ({ 
  apiKey, 
  center = { lat: 19.4326, lng: -99.1332 }, 
  zoom = 12, 
  geofences = [],
  history = [],
  routeData = null,
  assets = [],
  selectedAssetId = '',
  baseLayer = 'normal',
  showTraffic = false
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !window.H) return;

    // Initialize the platform object:
    const platform = new window.H.service.Platform({
      apikey: apiKey
    });

    const defaultLayers = platform.createDefaultLayers();

    // Initialize the map:
    const map = new window.H.Map(
      mapRef.current,
      defaultLayers.vector.normal.map,
      {
        center: center,
        zoom: zoom,
        pixelRatio: window.devicePixelRatio || 1
      }
    );

    // Add interactive behavior
    new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));

    // Create the default UI components
    window.H.ui.UI.createDefault(map, defaultLayers);

    mapInstance.current = map;

    // Render Geofences
    geofences.forEach(gf => {
      if (gf.geometry) {
        const reader = new window.H.data.geojson.Reader(undefined, {
          style: (_feature: any) => {
            return {
              fillColor: 'rgba(14, 165, 233, 0.2)',
              strokeColor: 'rgba(14, 165, 233, 0.8)',
              lineWidth: 2
            };
          }
        });
        reader.parseData(gf.geometry);
        map.addLayer(reader.getLayer());
      }
    });

    // Render History Polyline
    if (history.length > 0) {
      const lineString = new window.H.geo.LineString();
      history.forEach(point => {
        if (point.geometry && point.geometry.coordinates) {
          lineString.pushPoint({ 
            lat: point.geometry.coordinates[1], 
            lng: point.geometry.coordinates[0] 
          });
        }
      });

      const polyline = new window.H.map.Polyline(lineString, {
        style: { lineWidth: 4, strokeColor: '#0ea5e9' }
      });
      map.addObject(polyline);

      // Add start/end markers
      const startPoint = history[0].geometry.coordinates;
      const endPoint = history[history.length - 1].geometry.coordinates;

      const startMarker = new window.H.map.Marker({ lat: startPoint[1], lng: startPoint[0] });
      const endMarker = new window.H.map.Marker({ lat: endPoint[1], lng: endPoint[0] });
      
      map.addObjects([startMarker, endMarker]);
      
      // Zoom to history
      map.getViewModel().setLookAtData({
        bounds: polyline.getBoundingBox()
      });
    }

    // Render Optimized Route
    if (routeData && routeData.routes && routeData.routes[0]) {
      const route = routeData.routes[0];
      route.sections.forEach((section: any) => {
        // Decode flexible polyline
        const lineString = window.H.geo.LineString.fromFlexiblePolyline(section.polyline);
        const polyline = new window.H.map.Polyline(lineString, {
          style: { lineWidth: 6, strokeColor: '#8b5cf6' }
        });
        map.addObject(polyline);

        // Add start/end of section markers
        const startMarker = new window.H.map.Marker(lineString.extractPoint(0));
        const endMarker = new window.H.map.Marker(lineString.extractPoint(lineString.getPointCount() - 1));
        map.addObjects([startMarker, endMarker]);
      });

      // Zoom to route
      const bbox = route.sections.reduce((acc: any, section: any) => {
        const ls = window.H.geo.LineString.fromFlexiblePolyline(section.polyline);
        const poly = new window.H.map.Polyline(ls);
        const sectionBbox = poly.getBoundingBox();
        return acc ? acc.merge(sectionBbox) : sectionBbox;
      }, null);
      
      if (bbox) map.getViewModel().setLookAtData({ bounds: bbox });
    }

    // Render Fleet Assets
    assets.forEach(asset => {
      if (asset.lat && asset.lng) {
        const marker = new window.H.map.Marker({ lat: asset.lat, lng: asset.lng });
        
        // Add data to marker for identification
        marker.setData(asset.id);
        
        map.addObject(marker);

        if (asset.id === selectedAssetId) {
          map.setCenter({ lat: asset.lat, lng: asset.lng });
          map.setZoom(15);
        }
      }
    });

    // Update Base Layer
    if (mapInstance.current) {
      const layers = platform.createDefaultLayers();
      let selectedLayer;
      
      switch(baseLayer) {
        case 'satellite':
          selectedLayer = layers.raster.satellite.map;
          break;
        case 'terrain':
          selectedLayer = layers.raster.terrain.map;
          break;
        default:
          selectedLayer = layers.vector.normal.map;
      }
      
      map.setBaseLayer(selectedLayer);

      // Traffic overlay
      if (showTraffic) {
        map.addLayer(layers.vector.normal.traffic);
      }
    }

    // Handle resize
    const handleResize = () => map.getViewPort().resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mapInstance.current) {
        mapInstance.current.dispose();
      }
    };
  }, [apiKey]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default Map;
