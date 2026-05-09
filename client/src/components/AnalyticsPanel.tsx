import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Shield, TrendingUp, Truck } from 'lucide-react';
import { getWeeklyAnalytics } from '../services/api';

interface AnalyticsPanelProps {
  assets: any[];
  geofences: any[];
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ assets, geofences }) => {
  // Compute some quick stats based on real data
  const activeCount = assets.filter(a => a.status === 'moving').length;
  const inactiveCount = assets.length - activeCount;

  const fleetStatusData = [
    { name: 'En Movimiento', value: activeCount },
    { name: 'Detenidos', value: inactiveCount },
  ];

  const COLORS = ['#10b981', '#64748b'];

  const [weeklyDistanceData, setWeeklyDistanceData] = useState([
    { name: 'Mon', distance: 0 },
    { name: 'Tue', distance: 0 },
    { name: 'Wed', distance: 0 },
    { name: 'Thu', distance: 0 },
    { name: 'Fri', distance: 0 },
    { name: 'Sat', distance: 0 },
    { name: 'Sun', distance: 0 },
  ]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await getWeeklyAnalytics();
        if (data && data.length > 0) {
          // Format distances to 1 decimal place
          const formattedData = data.map((d: any) => ({
            name: d.name,
            distance: parseFloat(d.distance).toFixed(1)
          }));
          setWeeklyDistanceData(formattedData);
        }
      } catch (err) {
        console.error('Failed to load weekly analytics', err);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-20 overflow-y-auto p-8 animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto mt-16">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Activity className="text-brand-500" size={32} />
          Panel de Analíticas
        </h2>
        <p className="text-slate-400 mb-8">Información, rendimiento y salud de la flota en tiempo real.</p>

        {/* KPIs (Key Performance Indicators) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-brand-500/20 text-brand-500 rounded-xl">
                <Truck size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-bold uppercase">Total Flota</p>
                <p className="text-3xl font-bold text-white">{assets.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-500 rounded-xl">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-bold uppercase">En Movimiento</p>
                <p className="text-3xl font-bold text-white">{activeCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl">
                <Activity size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-bold uppercase">Velocidad Promedio</p>
                <p className="text-3xl font-bold text-white">42 <span className="text-sm font-normal text-slate-400">km/h</span></p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-indigo-500/20 text-indigo-500 rounded-xl">
                <Shield size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-bold uppercase">Geocercas Activas</p>
                <p className="text-3xl font-bold text-white">{geofences.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl lg:col-span-2">
            <h3 className="text-lg font-bold text-white mb-6">Kilometraje Semanal (Tendencia)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyDistanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: '#1e293b'}}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="distance" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6">Estado de la Flota</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fleetStatusData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {fleetStatusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-slate-400 uppercase font-bold">Activos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                <span className="text-xs text-slate-400 uppercase font-bold">Detenidos</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
