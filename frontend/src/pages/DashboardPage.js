import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Package, 
  ClipboardCheck,
  PackageOpen,
  TrendingUp
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    usersCount: 0,
    assetsCount: 0,
    assignmentsCount: 0,
    availableAssets: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stats`, {
        withCredentials: true
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      label: 'Pracownicy', 
      value: stats.usersCount, 
      icon: Users, 
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      borderColor: 'border-blue-400/20'
    },
    { 
      label: 'Sprzęt ogółem', 
      value: stats.assetsCount, 
      icon: Package, 
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400/20'
    },
    { 
      label: 'Przypisania', 
      value: stats.assignmentsCount, 
      icon: ClipboardCheck, 
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/20'
    },
    { 
      label: 'Sprzęt dostępny', 
      value: stats.availableAssets, 
      icon: PackageOpen, 
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      borderColor: 'border-purple-400/20'
    },
  ];

  return (
    <div className="p-6 lg:p-8" data-testid="dashboard-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-50 tracking-tight mb-2">Panel główny</h1>
        <p className="text-zinc-400">
          Witaj, <span className="text-yellow-400 font-medium">[{user?.badgeNumber}] {user?.firstName} {user?.lastName}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bgColor, borderColor }) => (
          <div 
            key={label}
            className={`border ${borderColor} ${bgColor} rounded-sm p-4 transition-all duration-150`}
            data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>
                  {loading ? '—' : value}
                </p>
              </div>
              <div className={`${bgColor} p-2 rounded-sm`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Info */}
        <div className="border border-zinc-800 bg-zinc-900 rounded-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Informacje o systemie</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-400 text-sm">Wersja systemu</span>
              <span className="text-zinc-200 text-sm font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-400 text-sm">Status</span>
              <span className="text-green-400 text-sm font-medium">Aktywny</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-400 text-sm">Twoja rola</span>
              <span className="text-yellow-400 text-sm font-medium uppercase">{user?.role}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-zinc-400 text-sm">Twój stopień</span>
              <span className="text-zinc-200 text-sm">{user?.position}</span>
            </div>
          </div>
        </div>

        {/* Your Info */}
        <div className="border border-zinc-800 bg-zinc-900 rounded-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Twoje dane</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-400 text-sm">Numer odznaki</span>
              <span className="text-yellow-400 text-sm font-mono font-bold">{user?.badgeNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-400 text-sm">Imię i nazwisko</span>
              <span className="text-zinc-200 text-sm">{user?.firstName} {user?.lastName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-400 text-sm">Email</span>
              <span className="text-zinc-200 text-sm">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-zinc-400 text-sm">Stanowisko</span>
              <span className="text-zinc-200 text-sm">{user?.position}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
