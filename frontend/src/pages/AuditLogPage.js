import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { History, Filter } from 'lucide-react';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/audit-logs`, {
        withCredentials: true
      });
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesEntity = filterEntity === 'all' || log.entityType === filterEntity;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'CREATE': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'UPDATE': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'DELETE': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getEntityBadgeColor = (entity) => {
    switch (entity) {
      case 'USER': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'ASSET': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'ASSIGNMENT': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="audit-log-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-zinc-50 tracking-tight mb-2">Historia zmian</h1>
        <p className="text-zinc-400">Dziennik wszystkich operacji w systemie</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px] max-w-md">
          <Input
            placeholder="Szukaj w szczegółach lub nazwie użytkownika..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="audit-search"
            className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[140px] bg-zinc-950 border-zinc-800 text-zinc-100">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all" className="text-zinc-100 focus:bg-zinc-800">Wszystkie</SelectItem>
              <SelectItem value="CREATE" className="text-zinc-100 focus:bg-zinc-800">Utworzenie</SelectItem>
              <SelectItem value="UPDATE" className="text-zinc-100 focus:bg-zinc-800">Aktualizacja</SelectItem>
              <SelectItem value="DELETE" className="text-zinc-100 focus:bg-zinc-800">Usunięcie</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-[140px] bg-zinc-950 border-zinc-800 text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all" className="text-zinc-100 focus:bg-zinc-800">Wszystkie</SelectItem>
              <SelectItem value="USER" className="text-zinc-100 focus:bg-zinc-800">Użytkownik</SelectItem>
              <SelectItem value="ASSET" className="text-zinc-100 focus:bg-zinc-800">Sprzęt</SelectItem>
              <SelectItem value="ASSIGNMENT" className="text-zinc-100 focus:bg-zinc-800">Przypisanie</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="text-center py-12 text-zinc-400">Ładowanie...</div>
      ) : (
        <div className="border border-zinc-800 rounded-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">Data</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">Akcja</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">Typ</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">Użytkownik</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">Szczegóły</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr 
                  key={log.id} 
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                  data-testid={`audit-row-${log.id}`}
                >
                  <td className="px-4 py-3 text-zinc-400 text-sm whitespace-nowrap">
                    {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm', { locale: pl })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-sm text-xs font-medium uppercase border ${getActionBadgeColor(log.action)}`}>
                      {log.action === 'CREATE' ? 'Utworzenie' : log.action === 'UPDATE' ? 'Aktualizacja' : 'Usunięcie'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-sm text-xs font-medium uppercase border ${getEntityBadgeColor(log.entityType)}`}>
                      {log.entityType === 'USER' ? 'Użytkownik' : log.entityType === 'ASSET' ? 'Sprzęt' : 'Przypisanie'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300 text-sm">{log.userName}</td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Brak wpisów do wyświetlenia</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AuditLogPage;
