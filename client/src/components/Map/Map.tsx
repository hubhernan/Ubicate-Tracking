import React, { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  apiKey?: string; // Kept for compatibility but ignored
  center?: { lat: number; lng: number };
  zoom?: number;
  geofences?: any[];
  history?: any[];
  historyPlaybackIndex?: number;
  routeData?: any;
  assets?: any[];
  selectedAssetId?: string;
  baseLayer?: 'normal' | 'satellite' | 'terrain';
  showTraffic?: boolean;
  isDrawingMode?: boolean;
  onPolygonDrawn?: (geoJson: any) => void;
}

// Fix default Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Map: React.FC<MapProps> = ({ 
  center = { lat: 19.4326, lng: -99.1332 }, 
  zoom = 12, 
  geofences = [],
  history = [],
  historyPlaybackIndex = 0,
  routeData = null,
  assets = [],
  selectedAssetId = '',
  baseLayer = 'normal',
  isDrawingMode = false,
  onPolygonDrawn
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);

  const geofenceLayerRef = useRef<L.FeatureGroup | null>(null);
  const historyLayerRef = useRef<L.FeatureGroup | null>(null);
  const routeLayerRef = useRef<L.FeatureGroup | null>(null);
  const assetsLayerRef = useRef<L.FeatureGroup | null>(null);
  const playbackLayerRef = useRef<L.FeatureGroup | null>(null);

  // Initialize Map and Layer Groups
  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false
      }).setView([center.lat, center.lng], zoom);
      
      geofenceLayerRef.current = L.featureGroup().addTo(mapInstance.current);
      historyLayerRef.current = L.featureGroup().addTo(mapInstance.current);
      routeLayerRef.current = L.featureGroup().addTo(mapInstance.current);
      assetsLayerRef.current = L.featureGroup().addTo(mapInstance.current);
      playbackLayerRef.current = L.featureGroup().addTo(mapInstance.current);
    }
  }, []); // Only run once on mount

  // Base Layer
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    if (baseLayerRef.current) map.removeLayer(baseLayerRef.current);
    
    let tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    let attribution = '&copy; OpenStreetMap contributors &copy; CARTO';
    if (baseLayer === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri';
    } else if (baseLayer === 'terrain') {
      tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      attribution = 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap';
    }
    baseLayerRef.current = L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);
  }, [baseLayer]);

  // Geofences
  useEffect(() => {
    const fg = geofenceLayerRef.current;
    if (!fg) return;
    fg.clearLayers();
    geofences.forEach(gf => {
      if (gf.geometry) {
        L.geoJSON(gf.geometry, {
          style: { color: '#0ea5e9', weight: 2, fillColor: '#0ea5e9', fillOpacity: 0.2 }
        }).addTo(fg);
      }
    });
  }, [geofences]);

  // History
  useEffect(() => {
    const fg = historyLayerRef.current;
    const map = mapInstance.current;
    if (!fg || !map) return;
    fg.clearLayers();
    if (history.length > 0) {
      const latlngs = history.map(point => {
        const coords = point.geometry?.coordinates;
        return coords ? [coords[1], coords[0]] as [number, number] : null;
      }).filter(Boolean) as [number, number][];

      if (latlngs.length > 0) {
        const polyline = L.polyline(latlngs, { color: '#0ea5e9', weight: 4 }).addTo(fg);
        L.circleMarker(latlngs[0], { radius: 6, color: '#10b981', fillOpacity: 1 }).addTo(fg);
        L.circleMarker(latlngs[latlngs.length - 1], { radius: 6, color: '#ef4444', fillOpacity: 1 }).addTo(fg);
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }
    }
  }, [history]);

  // History Playback Marker
  useEffect(() => {
    const fg = playbackLayerRef.current;
    if (!fg) return;
    fg.clearLayers();
    
    if (history.length > 0 && historyPlaybackIndex >= 0 && historyPlaybackIndex < history.length) {
      const point = history[historyPlaybackIndex];
      const coords = point.geometry?.coordinates;
      if (coords) {
        const customIcon = L.divIcon({
          className: 'playback-marker',
          html: `<div style="background-color: #f59e0b; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px #f59e0b;"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        L.marker([coords[1], coords[0]], { icon: customIcon }).addTo(fg);
        // Optional: pan camera smoothly to follow the playback
        // mapInstance.current?.panTo([coords[1], coords[0]], { animate: true });
      }
    }
  }, [historyPlaybackIndex, history]);

  // Routes
  useEffect(() => {
    const fg = routeLayerRef.current;
    const map = mapInstance.current;
    if (!fg || !map) return;
    fg.clearLayers();
    if (routeData && routeData.routes && routeData.routes[0]) {
      const route = routeData.routes[0];
      if (route.geometry) {
        L.geoJSON(route.geometry, {
          style: { color: '#8b5cf6', weight: 6, opacity: 0.8 }
        }).addTo(fg);
        const coords = route.geometry.coordinates;
        if (coords && coords.length > 0) {
          map.fitBounds(L.geoJSON(route.geometry).getBounds(), { padding: [50, 50] });
        }
      }
    }
  }, [routeData]);

  // Assets
  useEffect(() => {
    const fg = assetsLayerRef.current;
    const map = mapInstance.current;
    if (!fg || !map) return;
    fg.clearLayers();
    assets.forEach(asset => {
      if (asset.lat && asset.lng) {
        const isSelected = asset.id === selectedAssetId;
        const color = asset.status === 'moving' ? '#10b981' : '#64748b';
        
        const customIcon = L.divIcon({
          className: 'custom-asset-marker',
          html: `<div style="background-color: ${isSelected ? '#3b82f6' : color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const marker = L.marker([asset.lat, asset.lng], { icon: customIcon }).addTo(fg);
        marker.bindTooltip(`<b>${asset.name}</b><br/>${asset.status}`, { direction: 'top', offset: [0, -10] });

        if (isSelected) {
          map.panTo([asset.lat, asset.lng], { animate: true });
        }
      }
    });
  }, [assets, selectedAssetId]);

  // Drawing Mode Logic
  const drawnPointsRef = useRef<L.LatLng[]>([]);
  const drawingLayerRef = useRef<L.Polygon | null>(null);
  
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    
    if (isDrawingMode) {
      map.getContainer().style.cursor = 'crosshair';
      
      const onClick = (e: L.LeafletMouseEvent) => {
        drawnPointsRef.current.push(e.latlng);
        if (drawingLayerRef.current) {
          map.removeLayer(drawingLayerRef.current);
        }
        drawingLayerRef.current = L.polygon(drawnPointsRef.current, { 
          color: '#ef4444', 
          weight: 2, 
          dashArray: '5, 5', 
          fillOpacity: 0.2 
        }).addTo(map);
      };
      
      const finishPolygon = () => {
        if (drawnPointsRef.current.length >= 3 && onPolygonDrawn) {
          const coords = drawnPointsRef.current.map(p => [p.lng, p.lat]);
          coords.push([drawnPointsRef.current[0].lng, drawnPointsRef.current[0].lat]); // close
          
          const geoJson = {
            type: 'Polygon',
            coordinates: [coords]
          };
          onPolygonDrawn(geoJson);
        }
        // Reset
        drawnPointsRef.current = [];
        if (drawingLayerRef.current) map.removeLayer(drawingLayerRef.current);
        drawingLayerRef.current = null;
      };

      const onDblClick = (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        finishPolygon();
      };
      
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') finishPolygon();
      };

      const onCustomFinish = () => finishPolygon();

      map.on('click', onClick);
      map.on('dblclick', onDblClick);
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('finish-polygon', onCustomFinish);
      map.doubleClickZoom.disable();

      return () => {
        map.off('click', onClick);
        map.off('dblclick', onDblClick);
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('finish-polygon', onCustomFinish);
        map.doubleClickZoom.enable();
        map.getContainer().style.cursor = '';
        
        // Cleanup drawing if aborted
        drawnPointsRef.current = [];
        if (drawingLayerRef.current) map.removeLayer(drawingLayerRef.current);
        drawingLayerRef.current = null;
      };
    }
  }, [isDrawingMode, onPolygonDrawn]);

  // Full cleanup
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative z-0">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default Map;
