import React, { useState, useEffect } from 'react';
import Map from './components/Map/Map';
import Login from './components/Login';
import AnalyticsPanel from './components/AnalyticsPanel';
import { useLocation } from './hooks/useLocation';
import { useSocket } from './hooks/useSocket';
import { getGeofences, getHistory, calculateRoute, updateAssetMode, getAssets, createAsset, createGeofence, deleteAsset, updateAsset, getUserGroups, createGroup, joinGroup, getGroupMembers } from './services/api';
import { 
  Activity, 
  Map as MapIcon, 
  History, 
  Shield, 
  Settings, 
  Navigation,
  Battery,
  Signal,
  Menu,
  X,
  Bell,
  Search,
  Car,
  Leaf,
  Zap,
  Footprints,
  AlertTriangle,
  Plus,
  Truck,
  Layers,
  Globe,
  Wind,
  Trash2,
  Edit2,
  Users,
  Copy,
  Check
} from 'lucide-react';

const HERE_API_KEY = 'Xas3A0ZG88Y2g0DxgB8x';



const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [fleet, setFleet] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'live' | 'history' | 'routing' | 'geofences' | 'analytics' | 'groups'>('live');
  const [routeData, setRouteData] = useState<any>(null);
  const [baseLayer, setBaseLayer] = useState<'normal' | 'satellite' | 'terrain'>('normal');
  const [showTraffic, setShowTraffic] = useState(false);
  const [destination, setDestination] = useState('');
  const [drivingMode, setDrivingMode] = useState('normal');
  const [, setSpeedLimit] = useState(100);
  const [notifications, setNotifications] = useState<{ id: number; text: string; type: 'info' | 'warning' }[]>([]);
  const { coords, error } = useLocation();
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isPlayingHistory, setIsPlayingHistory] = useState(false);
  const [historyPlaybackIndex, setHistoryPlaybackIndex] = useState(0);
  const [newAsset, setNewAsset] = useState({ name: '', type: 'vehicle' });
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [newGeofenceGeoJSON, setNewGeofenceGeoJSON] = useState<any>(null);
  const [geofenceName, setGeofenceName] = useState('');
  
  // Groups State
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteCodeToJoin, setInviteCodeToJoin] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { emit, on, socket } = useSocket(import.meta.env.VITE_SOCKET_URL || 'https://ubicate-server.onrender.com');

  useEffect(() => {
    getGeofences().then(setGeofences).catch(console.error);
    getAssets().then(setFleet).catch(console.error);
    if (user?.id) {
      fetchGroups();
    }

    on('geofence-breach', (data: any) => {
      const names = data.geofences.map((g: any) => g.name).join(', ');
      addNotification(`Entered geofence: ${names}`, 'info');
    });

    on('speeding-alert', (data: any) => {
      addNotification(`Speed limit exceeded! ${data.speed.toFixed(1)} km/h in ${data.mode} mode.`, 'warning');
    });

    on('location-updated', (data: any) => {
      if (!data.id) return;
      setFleet(prevFleet => {
        const index = prevFleet.findIndex(a => a.id === data.id);
        if (index > -1) {
          const newFleet = [...prevFleet];
          newFleet[index] = { 
            ...newFleet[index], 
            lat: data.lat, 
            lng: data.lng, 
            status: data.status 
          };
          return newFleet;
        }
        return prevFleet;
      });
    });
  }, [on]);

  const addNotification = (text: string, type: 'info' | 'warning' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [{ id, text, type }, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const changeMode = async (mode: string, limit: number) => {
    if (!socket?.id) return;
    try {
      await updateAssetMode(socket.id, mode, limit);
      setDrivingMode(mode);
      setSpeedLimit(limit);
      addNotification(`Mode changed to ${mode} (Limit: ${limit} km/h)`, 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAsset = async () => {
    try {
      if (editingAsset) {
        await updateAsset(editingAsset.id, {
          name: newAsset.name,
          type: newAsset.type
        });
        addNotification('Asset updated successfully!', 'info');
      } else {
        await createAsset({
          name: newAsset.name,
          type: newAsset.type,
          userId: user?.id,
          metadata: { color: '#3b82f6' }
        });
        addNotification('Asset created successfully!', 'info');
      }
      
      const assetsList = await getAssets();
      setFleet(assetsList);
      setShowAssetModal(false);
      setEditingAsset(null);
      setNewAsset({ name: '', type: 'vehicle' });
    } catch (err) {
      console.error(err);
      addNotification(`Failed to ${editingAsset ? 'update' : 'create'} asset`, 'warning');
    }
  };

  const handleDeleteAsset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Seguro que deseas eliminar este vehículo? Esto borrará todo su historial.')) return;
    try {
      await deleteAsset(id);
      addNotification('Vehículo eliminado correctamente', 'info');
      const assetsList = await getAssets();
      setFleet(assetsList);
      if (selectedAssetId === id) setSelectedAssetId('');
    } catch (err) {
      console.error(err);
      addNotification('Error al eliminar vehículo', 'warning');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const fetchHistory = async () => {
    if (!selectedAssetId) {
      addNotification('Por favor, selecciona un activo de la flota primero', 'warning');
      return;
    }
    
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Last 24h
    try {
      const data = await getHistory(selectedAssetId, start, end);
      setHistory(data);
      setViewMode('history');
      setHistoryPlaybackIndex(0);
      setIsPlayingHistory(false);
      if (data.length === 0) {
        addNotification('No se encontró historial en las últimas 24h', 'info');
      } else {
        addNotification(`Historial cargado: ${data.length} puntos`, 'info');
      }
    } catch (err) {
      console.error(err);
      addNotification('Error al cargar historial', 'warning');
    }
  };

  const fetchGroups = async () => {
    if (!user?.id) return;
    try {
      const groups = await getUserGroups(user.id);
      setUserGroups(groups);
      if (groups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groups[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      getGroupMembers(selectedGroupId).then(setGroupMembers).catch(console.error);
    }
  }, [selectedGroupId]);

  const handleCreateGroup = async () => {
    try {
      await createGroup(newGroupName, user.id);
      addNotification('Familia creada correctamente', 'info');
      setNewGroupName('');
      fetchGroups();
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Error al crear la familia', 'warning');
    }
  };

  const handleJoinGroup = async () => {
    try {
      await joinGroup(inviteCodeToJoin, user.id);
      addNotification('¡Te has unido a la familia!', 'info');
      setInviteCodeToJoin('');
      fetchGroups();
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Código inválido o error al unirse', 'warning');
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSaveGeofence = async () => {
    try {
      const created = await createGeofence({
        name: geofenceName,
        description: '',
        geometry: newGeofenceGeoJSON,
        type: 'polygon'
      });
      setGeofences(prev => [...prev, created]);
      setShowGeofenceModal(false);
      setGeofenceName('');
      setNewGeofenceGeoJSON(null);
      addNotification('Geofence created successfully!', 'info');
      // Refetch to get formatted geometry
      getGeofences().then(setGeofences);
    } catch (err) {
      console.error(err);
      addNotification('Failed to save geofence', 'warning');
    }
  };

  const handleCalculateRoute = async () => {
    // Si no hay coordenadas (ej. el usuario denegó la ubicación), usamos un punto por defecto (CDMX)
    const currentLat = coords?.latitude || 19.4326;
    const currentLng = coords?.longitude || -99.1332;

    if (!destination.trim()) {
      addNotification('Por favor ingresa un destino', 'warning');
      return;
    }

    try {
      addNotification('Buscando destino...', 'info');
      // 1. Geocode with Nominatim (OpenStreetMap)
      const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1`);
      const geocodeData = await geocodeRes.json();

      if (!geocodeData || geocodeData.length === 0) {
        addNotification('Destino no encontrado. Intenta ser más específico.', 'warning');
        return;
      }

      const destLat = parseFloat(geocodeData[0].lat);
      const destLng = parseFloat(geocodeData[0].lon);

      addNotification('Calculando ruta óptima...', 'info');
      
      // 2. Request Route Calculation from our backend (OSRM)
      const data = await calculateRoute({
        origin: { lat: currentLat, lng: currentLng },
        destination: { lat: destLat, lng: destLng },
        transportMode: 'driving'
      });
      setRouteData(data);
      setViewMode('routing');
      addNotification('¡Ruta trazada con éxito!', 'info');
    } catch (err) {
      console.error('Error in route calculation:', err);
      addNotification('Error al calcular la ruta', 'warning');
    }
  };
  useEffect(() => {
    if (coords && user && isTransmitting && selectedAssetId) {
      emit('update-location', {
        assetId: selectedAssetId,
        lat: coords.latitude,
        lng: coords.longitude,
        speed: coords.speed || 0,
        heading: coords.heading || 0,
        accuracy: coords.accuracy || 0,
        battery: 85, // Mock battery for now
        status: 'moving'
      });
    }
  }, [coords, emit, user, selectedAssetId, isTransmitting]);

  // History Playback Timer
  useEffect(() => {
    let interval: any;
    if (isPlayingHistory && history.length > 0) {
      interval = setInterval(() => {
        setHistoryPlaybackIndex(prev => {
          if (prev >= history.length - 1) {
            setIsPlayingHistory(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500); // 500ms per point
    }
    return () => clearInterval(interval);
  }, [isPlayingHistory, history]);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden text-slate-200">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-full md:w-80' : 'w-20'} bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 transition-all duration-300 flex flex-col z-50 absolute md:relative h-full`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          {isSidebarOpen ? (
            <div className="flex items-center gap-3 text-white font-bold text-xl">
              <div className="p-2 bg-brand-500 rounded-lg">
                <Navigation size={20} />
              </div>
              Ubicate
            </div>
          ) : (
            <div className="p-2 bg-brand-500 rounded-lg mx-auto text-white">
              <Navigation size={20} />
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-2">
          <NavItem 
            icon={<MapIcon size={22} />} 
            label="Live Map" 
            active={viewMode === 'live'} 
            collapsed={!isSidebarOpen} 
            onClick={() => setViewMode('live')}
          />
          <NavItem 
            icon={<History size={22} />} 
            label="History" 
            active={viewMode === 'history'}
            collapsed={!isSidebarOpen} 
            onClick={fetchHistory}
          />
          <NavItem 
            icon={<Navigation size={22} />} 
            label="Optimize Route" 
            active={viewMode === 'routing'}
            collapsed={!isSidebarOpen} 
            onClick={() => setViewMode('routing')}
          />
          <NavItem 
            icon={<Shield size={22} />} 
            label="Geofences" 
            active={viewMode === 'geofences'}
            collapsed={!isSidebarOpen} 
            onClick={() => setViewMode('geofences')}
          />
          <NavItem 
            icon={<Activity size={22} />} 
            label="Analytics" 
            active={viewMode === 'analytics'}
            collapsed={!isSidebarOpen} 
            onClick={() => setViewMode('analytics')}
          />
          <NavItem 
            icon={<Users size={22} />} 
            label="Mi Familia" 
            active={viewMode === 'groups'}
            collapsed={!isSidebarOpen} 
            onClick={() => setViewMode('groups')}
          />
        </nav>

        {isSidebarOpen && (
          <div className="flex-1 overflow-y-auto px-4 py-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Fleet</h3>
              <button onClick={() => setShowAssetModal(true)} className="p-1 hover:bg-slate-800 rounded text-brand-500">
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {fleet.map(asset => (
                <div 
                  key={asset.id} 
                  onClick={() => setSelectedAssetId(asset.id)}
                  className={`group p-3 rounded-xl border transition-all cursor-pointer ${selectedAssetId === asset.id ? 'bg-brand-500/10 border-brand-500/50' : 'bg-slate-800/50 border-transparent hover:border-slate-700'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${asset.status === 'moving' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
                      <Truck size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{asset.name}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${asset.status === 'moving' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                        {asset.status.toUpperCase()}
                      </p>
                    </div>
                    {asset.battery_level && (
                      <div className="text-[10px] font-mono text-slate-400">
                        {asset.battery_level}%
                      </div>
                    )}
                    <div className="flex gap-1 ml-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAsset(asset);
                          setNewAsset({ name: asset.name, type: asset.type || 'vehicle' });
                          setShowAssetModal(true);
                        }}
                        className="p-1 hover:text-brand-500 hover:bg-brand-500/10 rounded"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteAsset(asset.id, e)}
                        className="p-1 hover:text-red-500 hover:bg-red-500/10 rounded"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-slate-800">
          <NavItem icon={<Settings size={22} />} label="Settings" collapsed={!isSidebarOpen} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative w-full overflow-hidden">
        {/* Header */}
        <header className="h-auto min-h-[4rem] bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex flex-col md:flex-row items-center justify-between px-4 md:px-6 py-2 md:py-0 z-10 absolute top-0 left-0 right-0 gap-2 md:gap-0 pl-20 md:pl-6">
          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-start">
            <h2 className="text-xs md:text-sm font-medium text-slate-400">Global Overview</h2>
            <div className="hidden md:block h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2 text-emerald-400 text-[10px] md:text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM ACTIVE
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 md:gap-6 w-full md:w-auto">
             <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
                <ModeButton 
                  icon={<Car size={14} />} 
                  active={drivingMode === 'normal'} 
                  onClick={() => changeMode('normal', 100)} 
                />
                <ModeButton 
                  icon={<Leaf size={14} />} 
                  active={drivingMode === 'economic'} 
                  onClick={() => changeMode('economic', 80)} 
                />
                <ModeButton 
                  icon={<Zap size={14} />} 
                  active={drivingMode === 'urgent'} 
                  onClick={() => changeMode('urgent', 130)} 
                />
                <ModeButton 
                  icon={<Footprints size={14} />} 
                  active={drivingMode === 'pedestrian'} 
                  onClick={() => changeMode('pedestrian', 10)} 
                />
             </div>
             <div className="hidden md:block h-6 w-px bg-slate-800" />
             <div className="flex items-center gap-3 text-slate-400">
                <div className="flex items-center gap-1">
                  <Battery size={14} />
                  <span className="text-[10px] md:text-xs">85%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Signal size={14} />
                  <span className="text-[10px] md:text-xs">LTE</span>
                </div>
             </div>
             <div className="flex items-center gap-3">
               <button 
                 onClick={handleLogout}
                 className="relative p-1 md:p-2 text-slate-400 hover:text-white transition-colors"
               >
                 <Bell size={18} />
                 <span className="absolute top-1 right-1 w-2 h-2 bg-brand-500 rounded-full border-2 border-slate-900" />
               </button>
               <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-brand-500 to-indigo-500 cursor-pointer" onClick={handleLogout} />
             </div>
          </div>
        </header>

        {/* Map Container */}
        <div className="absolute inset-0 z-0">
          <Map 
            apiKey={HERE_API_KEY}
            center={coords ? { lat: coords.latitude, lng: coords.longitude } : { lat: 19.4326, lng: -99.1332 }}
            zoom={14}
            geofences={geofences}
            history={viewMode === 'history' ? history : []} 
            historyPlaybackIndex={historyPlaybackIndex}
            routeData={viewMode === 'routing' ? routeData : null}
            assets={fleet}
            selectedAssetId={selectedAssetId}
            baseLayer={baseLayer}
            showTraffic={showTraffic}
            isDrawingMode={isDrawingMode}
            onPolygonDrawn={(geoJson) => {
              setNewGeofenceGeoJSON(geoJson);
              setShowGeofenceModal(true);
              setIsDrawingMode(false);
            }}
          />
        </div>

        {/* Map Layer Controls */}
        <div className="absolute bottom-24 md:bottom-40 right-4 md:right-8 flex flex-col gap-2 z-10 scale-90 md:scale-100 origin-bottom-right">
          <button 
            onClick={() => setBaseLayer('normal')}
            className={`p-3 rounded-xl shadow-lg transition-all ${baseLayer === 'normal' ? 'bg-brand-500 text-white' : 'bg-slate-900/90 text-slate-400 hover:text-white'}`}
            title="Standard Map"
          >
            <MapIcon size={20} />
          </button>
          <button 
            onClick={() => setBaseLayer('satellite')}
            className={`p-3 rounded-xl shadow-lg transition-all ${baseLayer === 'satellite' ? 'bg-brand-500 text-white' : 'bg-slate-900/90 text-slate-400 hover:text-white'}`}
            title="Satellite View"
          >
            <Globe size={20} />
          </button>
          <button 
            onClick={() => setBaseLayer('terrain')}
            className={`p-3 rounded-xl shadow-lg transition-all ${baseLayer === 'terrain' ? 'bg-brand-500 text-white' : 'bg-slate-900/90 text-slate-400 hover:text-white'}`}
            title="Terrain View"
          >
            <Layers size={20} />
          </button>
          <div className="h-px bg-slate-800 my-1" />
          <button 
            onClick={() => setShowTraffic(!showTraffic)}
            className={`p-3 rounded-xl shadow-lg transition-all ${showTraffic ? 'bg-amber-500 text-white' : 'bg-slate-900/90 text-slate-400 hover:text-white'}`}
            title="Toggle Traffic"
          >
            <Wind size={20} />
          </button>
        </div>

        {/* Routing Panel */}
        {viewMode === 'routing' && (
          <div className="absolute top-24 md:top-20 left-4 md:left-8 w-[calc(100%-2rem)] md:w-80 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-2xl z-10 animate-in slide-in-from-left-4">
            <h3 className="font-bold text-white mb-4">Route Optimization</h3>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Ej. Zócalo, CDMX..." 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-500"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCalculateRoute()}
                />
              </div>
              <button 
                onClick={handleCalculateRoute}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Navigation size={18} />
                Optimize Route
              </button>
            </div>

            {routeData && routeData.routes && (
              <div className="mt-6 pt-6 border-t border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Summary</span>
                  <span className="px-2 py-0.5 bg-brand-500/10 text-brand-500 text-[10px] font-bold rounded">Fastest</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Distance</p>
                    <p className="text-lg font-bold text-white">{(routeData.routes[0].sections[0].summary.length / 1000).toFixed(1)} km</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Duration</p>
                    <p className="text-lg font-bold text-white">{Math.round(routeData.routes[0].sections[0].summary.duration / 60)} min</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Geofences Panel */}
        {viewMode === 'geofences' && (
          <div className="absolute top-24 md:top-20 left-4 md:left-8 w-[calc(100%-2rem)] md:w-80 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-2xl z-10 animate-in slide-in-from-left-4">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Shield size={18} /> Geofences</h3>
            <p className="text-xs text-slate-400 mb-4">
              Geofences trigger alerts when assets cross their boundaries.
            </p>
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {geofences.map(gf => (
                <div key={gf.id} className="p-2 bg-slate-800 rounded-lg text-sm flex items-center justify-between">
                  <span className="text-white">{gf.name}</span>
                </div>
              ))}
              {geofences.length === 0 && <p className="text-xs text-slate-500">No geofences found.</p>}
            </div>
            {isDrawingMode ? (
               <div className="bg-amber-500/20 text-amber-500 p-3 rounded-lg text-xs font-bold border border-amber-500/50">
                 Haz clic en el mapa para dibujar puntos. <br/><br/>Presiona <b>Enter</b> o haz clic en el botón para finalizar el polígono.
                 <button onClick={() => document.dispatchEvent(new Event('finish-polygon'))} className="mt-4 block w-full text-center py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors">Terminar y Guardar</button>
                 <button onClick={() => setIsDrawingMode(false)} className="mt-2 block w-full text-center py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors">Cancelar</button>
               </div>
            ) : (
               <button 
                 onClick={() => setIsDrawingMode(true)}
                 className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
               >
                 <Plus size={16} /> Crear Geocerca
               </button>
            )}
          </div>
        )}

        {/* Groups Panel */}
        {viewMode === 'groups' && (
          <div className="absolute top-24 md:top-20 left-4 md:left-8 w-[calc(100%-2rem)] md:w-96 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-2xl z-10 animate-in slide-in-from-left-4">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Users size={18} /> Mi Familia</h3>
            <p className="text-xs text-slate-400 mb-6">
              Administra tus grupos familiares y comparte el código para que otros se unan.
            </p>
            
            {/* Create Group */}
            <div className="bg-slate-800/50 p-4 rounded-xl mb-4 border border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Crear Nueva Familia</h4>
              <div className="flex gap-2">
                <input 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ej. Familia Gómez"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
                <button 
                  onClick={handleCreateGroup}
                  disabled={!newGroupName}
                  className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Crear
                </button>
              </div>
            </div>

            {/* Join Group */}
            <div className="bg-slate-800/50 p-4 rounded-xl mb-6 border border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Unirse a Familia</h4>
              <div className="flex gap-2">
                <input 
                  value={inviteCodeToJoin}
                  onChange={(e) => setInviteCodeToJoin(e.target.value.toUpperCase())}
                  placeholder="Código de 6 dígitos"
                  maxLength={6}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono uppercase tracking-widest focus:outline-none focus:border-brand-500"
                />
                <button 
                  onClick={handleJoinGroup}
                  disabled={inviteCodeToJoin.length < 6}
                  className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Unirse
                </button>
              </div>
            </div>

            {/* List Groups */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tus Grupos</h4>
              {userGroups.length === 0 ? (
                <p className="text-xs text-slate-500">No perteneces a ninguna familia aún.</p>
              ) : (
                userGroups.map(group => (
                  <div key={group.id} className="border border-slate-800 rounded-xl overflow-hidden">
                    <div 
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${selectedGroupId === group.id ? 'bg-brand-500/10' : 'bg-slate-800 hover:bg-slate-700'}`}
                    >
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        {group.name}
                        {group.role === 'admin' && <span className="text-[9px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Admin</span>}
                      </div>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); copyInviteCode(group.invite_code); }}
                        className="flex items-center gap-1.5 text-xs font-mono bg-slate-900 text-slate-300 px-2 py-1 rounded hover:text-white hover:bg-slate-950 transition-colors"
                        title="Copiar código de invitación"
                      >
                        {group.invite_code}
                        {copiedCode === group.invite_code ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                    
                    {/* Members List */}
                    {selectedGroupId === group.id && (
                      <div className="p-3 bg-slate-900/50 border-t border-slate-800">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Miembros</p>
                        <div className="space-y-2">
                          {groupMembers.map(member => (
                            <div key={member.id} className="flex justify-between items-center text-xs">
                              <span className="text-slate-300">{member.full_name}</span>
                              <span className="text-slate-500 capitalize">{member.role}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* History Player Overlay */}
        {viewMode === 'history' && history.length > 0 && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-[400px] bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 md:p-5 shadow-2xl z-10 flex flex-col gap-4 animate-in slide-in-from-top-4">
            <div className="flex justify-between items-center text-white">
              <h3 className="font-bold text-sm flex items-center gap-2"><History size={16} className="text-brand-500" /> Reproductor de Historial</h3>
              <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-1 rounded">{historyPlaybackIndex + 1} / {history.length}</span>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max={history.length - 1} 
              value={historyPlaybackIndex}
              onChange={(e) => setHistoryPlaybackIndex(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => {
                  setHistoryPlaybackIndex(0);
                  setIsPlayingHistory(false);
                }}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                title="Reiniciar"
              >
                <div className="w-4 h-4 bg-current rounded-sm" /> {/* Stop Icon */}
              </button>
              <button 
                onClick={() => setIsPlayingHistory(!isPlayingHistory)}
                className="px-8 py-2 bg-brand-500 text-white rounded-lg font-bold hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
              >
                {isPlayingHistory ? (
                  <>
                    <div className="flex gap-1"><div className="w-1.5 h-4 bg-white rounded-full"/><div className="w-1.5 h-4 bg-white rounded-full"/></div>
                    Pausa
                  </>
                ) : (
                  <>
                    <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                    Play
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Analytics Panel */}
        {viewMode === 'analytics' && (
          <AnalyticsPanel assets={fleet} geofences={geofences} />
        )}

        {/* Notifications */}
        <div className="absolute top-20 right-8 flex flex-col gap-2 z-20 pointer-events-none">
          {notifications.map((notif) => (
            <div key={notif.id} className={`
              ${notif.type === 'warning' ? 'bg-amber-500' : 'bg-brand-500'} 
              text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-right-full pointer-events-auto
            `}>
              {notif.type === 'warning' ? <AlertTriangle size={18} /> : <Bell size={18} />}
              <span className="text-sm font-medium">{notif.text}</span>
            </div>
          ))}
        </div>

        {/* Floating Status Card */}
        <div className="absolute bottom-4 left-4 md:left-auto md:bottom-8 md:right-8 w-[calc(100%-2rem)] md:w-64 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 md:p-5 shadow-2xl z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-white">My Device</h3>
              <p className="text-xs text-slate-400">
                {isTransmitting ? 'Transmitting' : 'Standby Mode'}
              </p>
            </div>
            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isTransmitting ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'}`}>
              {isTransmitting ? 'LIVE' : 'IDLE'}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Speed</p>
              <p className="text-lg font-bold text-white">{(coords?.speed || 0).toFixed(1)} <span className="text-xs font-normal text-slate-400">km/h</span></p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Accuracy</p>
              <p className="text-lg font-bold text-white">{(coords?.accuracy || 0).toFixed(0)} <span className="text-xs font-normal text-slate-400">m</span></p>
            </div>
          </div>

          <button 
            onClick={() => {
              if (!coords && !isTransmitting) {
                addNotification('Esperando señal GPS...', 'warning');
                return;
              }
              if (!selectedAssetId && !isTransmitting) {
                addNotification('Selecciona un activo de la flota primero', 'warning');
                return;
              }
              setIsTransmitting(!isTransmitting);
            }}
            className={`w-full py-2 rounded-lg font-bold text-sm transition-colors flex justify-center items-center gap-2 ${isTransmitting ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-brand-500 text-white hover:bg-brand-600'}`}
          >
            {isTransmitting ? 'Detener Transmisión' : 'Transmitir Ubicación'}
          </button>

          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
            <span>LAT: {coords ? coords.latitude.toFixed(4) : '--.----'}</span>
            <span>LNG: {coords ? coords.longitude.toFixed(4) : '--.----'}</span>
          </div>
        </div>

        {error && (
          <div className="absolute top-28 md:top-20 right-4 md:right-8 bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg px-4 py-2 text-xs flex items-center gap-2 z-10">
            <Shield size={14} />
            {error}
          </div>
        )}

        {showAssetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
              <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                <Truck className="text-brand-500" /> {editingAsset ? 'Edit Asset' : 'Add New Asset'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold">Asset Name</label>
                  <input 
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white mt-1 focus:outline-none focus:border-brand-500 transition-colors" 
                    placeholder="e.g. Delivery Truck 01"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold">Type</label>
                  <select 
                    value={newAsset.type}
                    onChange={(e) => setNewAsset({...newAsset, type: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white mt-1 focus:outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="vehicle">Vehicle</option>
                    <option value="person">Person</option>
                    <option value="package">Package</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                  <button onClick={() => { setShowAssetModal(false); setEditingAsset(null); setNewAsset({name: '', type: 'vehicle'})}} className="px-4 py-2 rounded-lg font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">Cancel</button>
                  <button onClick={handleAddAsset} disabled={!newAsset.name} className="px-6 py-2 rounded-lg font-bold bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors">{editingAsset ? 'Update' : 'Save Asset'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showGeofenceModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
              <h2 className="text-xl font-bold mb-4 text-white">Save Geofence</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold">Geofence Name</label>
                  <input 
                    value={geofenceName}
                    onChange={(e) => setGeofenceName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white mt-1 focus:outline-none focus:border-brand-500" 
                    placeholder="e.g. Headquarters"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => { setShowGeofenceModal(false); setNewGeofenceGeoJSON(null); }} className="px-4 py-2 rounded-lg font-bold text-slate-400 hover:bg-slate-800 transition-colors">Cancel</button>
                  <button onClick={handleSaveGeofence} disabled={!geofenceName} className="px-4 py-2 rounded-lg font-bold bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

const ModeButton: React.FC<{ icon: React.ReactNode, active: boolean, onClick: () => void }> = ({ icon, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`p-1.5 rounded-md transition-all ${active ? 'bg-brand-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
  >
    {icon}
  </button>
);

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, collapsed, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`
      w-full flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200
      ${active ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
      ${collapsed ? 'justify-center' : ''}
    `}>
      {icon}
      {!collapsed && <span className="font-medium">{label}</span>}
    </button>
  );
};

export default App;
