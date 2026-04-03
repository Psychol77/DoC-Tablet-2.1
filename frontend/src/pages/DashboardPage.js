import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 lg:p-8" data-testid="dashboard-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-50 tracking-tight mb-2">Panel główny</h1>
        <p className="text-zinc-400">
          Witaj, <span className="text-yellow-400 font-medium">[{user?.badgeNumber}] {user?.firstName} {user?.lastName}</span>
        </p>
      </div>

      {/* Welcome Card */}
      <div className="border border-zinc-800 bg-zinc-900 rounded-sm p-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-yellow-400/10 border border-yellow-400/20 rounded-sm flex items-center justify-center">
            <Shield className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100">System Department Of Corrections</h2>
            <p className="text-zinc-400 text-sm">System zarządzania personelem i wyposażeniem</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between py-3 border-b border-zinc-800">
            <span className="text-zinc-400 text-sm">Twoja rola</span>
            <span className={`text-sm font-medium uppercase ${
              user?.role === 'founder' ? 'text-yellow-400' : 'text-zinc-300'
            }`}>
              {user?.role}
            </span>
          </div>
          <div className="flex justify-between py-3 border-b border-zinc-800">
            <span className="text-zinc-400 text-sm">Stopień</span>
            <span className="text-zinc-200 text-sm">{user?.position}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-zinc-800">
            <span className="text-zinc-400 text-sm">Numer odznaki</span>
            <span className="text-yellow-400 text-sm font-mono font-bold">{user?.badgeNumber}</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-zinc-400 text-sm">Status</span>
            <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-sm text-xs font-medium uppercase">
              Aktywny
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
