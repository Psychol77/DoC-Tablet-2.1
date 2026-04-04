import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Shield, Package, User, ClipboardList, Plus, Loader2 } from 'lucide-react';
import { EQUIPMENT_LIST, cn } from '../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedGear, setSelectedGear] = useState(null);
  const [formData, setFormData] = useState({ serial: '', amount: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentAssets, setRecentAssets] = useState([]);

  useEffect(() => {
    fetchRecentAssets();
  }, []);

  const fetchRecentAssets = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/assignments/user/${user?.id}`, {
        withCredentials: true
      });
      setRecentAssets(response.data.slice(0, 3));
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const handleGearSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGear) return;
    
    setIsSubmitting(true);
    try {
      const assetData = {
        name: selectedGear.name,
        serialNumber: selectedGear.hasSerial ? formData.serial : `AUTO-${Date.now()}`,
        category: selectedGear.category || 'Inne',
        status: 'W użyciu'
      };

      await axios.post(`${API_URL}/api/assets/my-equipment`, assetData, {
        withCredentials: true
      });

      toast.success(`Pobrano pomyślnie: ${selectedGear.name}`);
      setSelectedGear(null);
      setFormData({ serial: '', amount: 1 });
      fetchRecentAssets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Błąd podczas pobierania sprzętu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 text-white space-y-8" data-testid="dashboard-page">
      {/* NAGŁÓWEK */}
      <header>
        <h1 className="text-3xl font-bold mb-1">Panel główny</h1>
        <p className="text-zinc-400">
          Witaj, <span className="text-yellow-500 font-bold">[{user?.badgeNumber || '01'}] {user?.firstName} {user?.lastName}</span>
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEWA KOLUMNA */}
        <div className="lg:col-span-2 space-y-6">
          {/* STATUS PRACOWNIKA */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-md p-6">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 border border-yellow-500/20 rounded flex items-center justify-center">
                <Shield className="text-yellow-500 w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-100 uppercase tracking-tight">System Department Of Corrections</h2>
                <p className="text-zinc-500 text-sm font-medium">Zarządzanie personelem i wyposażeniem</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">Stopień / Ranga</span>
                <span className="text-yellow-500 font-bold uppercase">{user?.position || 'WARDEN'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">Numer odznaki</span>
                <span className="text-yellow-500 font-bold">{user?.badgeNumber || '01'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">Status systemowy</span>
                <span className="text-green-500 text-[10px] font-black px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded uppercase tracking-widest">Aktywny</span>
              </div>
            </div>
          </div>

          {/* SIATKA KAFELKÓW AKCJI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* KAFELEK: POBIERZ SPRZĘT */}
            <Dialog>
              <DialogTrigger asChild>
                <button 
                  data-testid="get-equipment-btn"
                  className="group flex items-center gap-4 p-6 bg-zinc-950 border border-zinc-800 rounded-md hover:border-yellow-500/50 transition-all text-left"
                >
                  <div className="p-3 bg-zinc-900 rounded border border-zinc-800 group-hover:bg-yellow-500 transition-colors">
                    <Package className="w-6 h-6 text-yellow-500 group-hover:text-black" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-100 uppercase text-sm tracking-widest">Pobierz Wyposażenie</h3>
                    <p className="text-zinc-500 text-xs">Broń, amunicja, sprzęt pomocniczy</p>
                  </div>
                </button>
              </DialogTrigger>
              
              <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold uppercase tracking-tight text-yellow-500">Formularz wydania sprzętu</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleGearSubmit} className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Wybierz przedmiot</label>
                    <select 
                      className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-none text-white focus:border-yellow-500 outline-none"
                      data-testid="gear-select"
                      onChange={(e) => {
                        const gear = EQUIPMENT_LIST.find(g => g.id === e.target.value);
                        setSelectedGear(gear);
                        setFormData({ serial: '', amount: 1 });
                      }}
                      required
                    >
                      <option value="">-- LISTA WYPOSAŻENIA --</option>
                      {EQUIPMENT_LIST.map(item => (
                        <option key={item.id} value={item.id}>{item.name} ({item.category})</option>
                      ))}
                    </select>
                  </div>

                  {selectedGear && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      {selectedGear.hasSerial ? (
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Numer Seryjny (S/N)</label>
                          <Input 
                            type="text"
                            placeholder="NP. CP-9921"
                            className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-none focus:border-yellow-500 outline-none font-mono text-white"
                            value={formData.serial}
                            onChange={(e) => setFormData({...formData, serial: e.target.value})}
                            data-testid="serial-input"
                            required
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Ilość sztuk</label>
                          <Input 
                            type="number"
                            min="1"
                            className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-none focus:border-yellow-500 outline-none text-white"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            data-testid="amount-input"
                            required
                          />
                        </div>
                      )}
                      
                      <Button 
                        type="submit"
                        disabled={isSubmitting}
                        data-testid="confirm-gear-btn"
                        className="w-full bg-yellow-500 text-black font-black py-4 uppercase text-xs tracking-[0.2em] hover:bg-yellow-400 transition-colors"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Pobieranie...
                          </span>
                        ) : (
                          'Potwierdź Pobranie'
                        )}
                      </Button>
                    </div>
                  )}
                </form>
              </DialogContent>
            </Dialog>

            {/* KAFELEK: MÓJ PROFIL */}
            <Link 
              to="/profile"
              data-testid="my-profile-btn"
              className="group flex items-center gap-4 p-6 bg-zinc-950 border border-zinc-800 rounded-md hover:border-zinc-600 transition-all text-left"
            >
              <div className="p-3 bg-zinc-900 rounded border border-zinc-800">
                <User className="w-6 h-6 text-zinc-400" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-100 uppercase text-sm tracking-widest">Mój Profil</h3>
                <p className="text-zinc-500 text-xs">Paski zasług i Twoje wyposażenie</p>
              </div>
            </Link>

          </div>
        </div>

        {/* PRAWA KOLUMNA: OSTATNIE POBRANIA */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-md p-6 h-fit">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Ostatnie Pobrania
          </h3>
          <div className="space-y-4">
            {recentAssets.length > 0 ? (
              recentAssets.map(asset => (
                <div key={asset.id} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded">
                  <p className="text-sm font-bold text-zinc-200">{asset.assetName}</p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">S/N: {asset.assetSerialNumber}</p>
                </div>
              ))
            ) : (
              <p className="text-zinc-600 text-xs italic">Brak ostatnich pobrań sprzętu.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
