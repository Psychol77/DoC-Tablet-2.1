import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
  AlertDialogTitle, AlertDialogTrigger 
} from '../components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '../components/ui/select';
import { 
  Package, Plus, Search, Trash2, ShieldAlert, Loader2, User 
} from 'lucide-react';
import { toast } from 'sonner';
import { EQUIPMENT_LIST, CATEGORIES, STATUSES, cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Items requiring serial number (only weapons)
const SERIAL_REQUIRED = ['Combat Pistol', 'BBG', 'SMG', 'Tazer'];

export default function EquipmentPage() {
  const { user, isFounder, canEditProfiles } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '', serialNumber: '', category: 'Wyposażenie', status: 'Dostępny', amount: 1
  });

  // Check if user is command level (can see all equipment)
  const isCommandLevel = isFounder || canEditProfiles;

  useEffect(() => {
    fetchAssets();
  }, [user]);

  const fetchAssets = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/assets`, { withCredentials: true });
      let filteredAssets = response.data;
      
      // Officers can only see their own equipment
      if (!isCommandLevel) {
        filteredAssets = filteredAssets.filter(asset => 
          asset.assignedTo === user?.id && asset.status !== 'Zutylizowany'
        );
      }
      
      setAssets(filteredAssets);
    } catch (error) {
      toast.error('Błąd podczas pobierania sprzętu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    
    const isWeapon = SERIAL_REQUIRED.includes(newAsset.name);
    
    // Validate serial number for weapons
    if (isWeapon && !newAsset.serialNumber.trim()) {
      toast.error(`Dla ${newAsset.name} numer seryjny jest wymagany!`);
      return;
    }

    // Validate amount for non-weapons
    const amount = isWeapon ? 1 : parseInt(newAsset.amount) || 1;
    if (!isWeapon && amount < 1) {
      toast.error('Ilość musi być co najmniej 1');
      return;
    }

    try {
      // For weapons: single item with serial
      // For others: create N items with auto serial containing quantity info
      const serialNumber = isWeapon 
        ? newAsset.serialNumber 
        : `x${amount}`;

      await axios.post(`${API_URL}/api/assets/my-equipment`, {
        ...newAsset,
        serialNumber
      }, { withCredentials: true });
      
      toast.success(`Sprzęt dodany: ${newAsset.name}${!isWeapon ? ` (x${amount})` : ''}`);
      setIsAddDialogOpen(false);
      setNewAsset({ name: '', serialNumber: '', category: 'Wyposażenie', status: 'Dostępny', amount: 1 });
      fetchAssets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Błąd dodawania');
    }
  };

  const handleDisposeAsset = async (asset) => {
    try {
      await axios.put(`${API_URL}/api/assets/${asset.id}`, {
        ...asset,
        status: 'Zutylizowany'
      }, { withCredentials: true });
      
      toast.success('Sprzęt zutylizowany');
      fetchAssets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Błąd utylizacji');
    }
  };

  // Advanced search - filter by name, serial, AND assigned person
  const filteredAssets = assets.filter(asset => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = asset.name.toLowerCase().includes(searchLower);
    const serialMatch = asset.serialNumber?.toLowerCase().includes(searchLower);
    const assignedMatch = asset.assignedToName?.toLowerCase().includes(searchLower);
    
    return nameMatch || serialMatch || assignedMatch;
  });

  // Group assets: active vs disposed
  const activeAssets = filteredAssets.filter(a => a.status !== 'Zutylizowany');
  const disposedAssets = filteredAssets.filter(a => a.status === 'Zutylizowany');

  return (
    <div className="p-8 text-white animate-in fade-in duration-500" data-testid="equipment-page">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">
            {isCommandLevel ? 'Magazyn Uzbrojenia' : 'Moje Wyposażenie'}
          </h1>
          <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-bold">
            {isCommandLevel ? 'Zarządzanie zasobami DOC' : 'Twój przypisany sprzęt'}
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-asset-button"
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase px-6 rounded-none shadow-[0_0_15px_rgba(234,179,8,0.3)]"
            >
              <Plus className="w-4 h-4 mr-2 stroke-[3px]" /> Pobierz Sprzęt
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle className="uppercase font-black text-yellow-500 italic text-xl">
                Formularz wydania sprzętu
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddAsset} className="space-y-4 mt-4 text-left">
              <p className="text-sm text-zinc-400">
                Sprzęt zostanie automatycznie przypisany do Ciebie.
              </p>
              
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-zinc-500">Typ Przedmiotu</Label>
                <Select 
                  onValueChange={(val) => {
                    const item = EQUIPMENT_LIST.find(i => i.id === val);
                    setNewAsset({
                      ...newAsset, 
                      name: item?.name || val, 
                      category: item?.category || 'Inne',
                      serialNumber: item?.hasSerial ? '' : '',
                      amount: 1
                    });
                  }}
                >
                  <SelectTrigger data-testid="add-asset-name" className="bg-zinc-900 border-zinc-800 rounded-none text-white">
                    <SelectValue placeholder="Wybierz z listy..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-60">
                    {EQUIPMENT_LIST.map(item => (
                      <SelectItem key={item.id} value={item.id} className="focus:bg-zinc-800">
                        {item.name} ({item.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Serial number - only for weapons */}
              {SERIAL_REQUIRED.includes(newAsset.name) && (
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-zinc-500">Numer Seryjny (S/N)</Label>
                  <Input 
                    className="bg-zinc-900 border-zinc-800 font-mono text-white focus:border-yellow-500 rounded-none" 
                    value={newAsset.serialNumber}
                    onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})}
                    data-testid="add-asset-serial"
                    placeholder="Wpisz S/N..."
                    required
                  />
                </div>
              )}

              {/* Amount - for non-weapons */}
              {newAsset.name && !SERIAL_REQUIRED.includes(newAsset.name) && (
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-zinc-500">Ilość (szt.)</Label>
                  <Input 
                    type="number"
                    min="1"
                    className="bg-zinc-900 border-zinc-800 font-mono text-white focus:border-yellow-500 rounded-none" 
                    value={newAsset.amount}
                    onChange={e => setNewAsset({...newAsset, amount: e.target.value})}
                    data-testid="add-asset-amount"
                    placeholder="1"
                    required
                  />
                </div>
              )}

              <Button 
                type="submit" 
                data-testid="add-asset-submit"
                className="w-full bg-yellow-500 text-black font-black uppercase py-6 mt-4 hover:bg-yellow-400 rounded-none"
              >
                Potwierdź Pobranie
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info for officers */}
      {!isCommandLevel && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-none">
          <p className="text-blue-400 text-sm font-bold">
            Widzisz tylko sprzęt przypisany do Ciebie. Kadra zarządzająca (Board/Command) ma dostęp do pełnej ewidencji.
          </p>
        </div>
      )}

      {/* Search - enhanced for person search */}
      <div className="relative mb-8 max-w-2xl group text-left">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-yellow-500 transition-colors" />
        <Input
          placeholder={isCommandLevel 
            ? "Szukaj po nazwie, S/N, nazwisku lub odznace..." 
            : "Szukaj po nazwie lub S/N..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="equipment-search"
          className="pl-12 bg-zinc-950 border-zinc-800 h-14 text-lg focus:border-yellow-500 rounded-none border-2 text-white shadow-xl"
        />
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-4 text-zinc-700">
          <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
          <p className="uppercase font-black tracking-widest">Ładowanie ewidencji...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Equipment */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-none overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900 text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500 border-b border-zinc-800">
                  <th className="p-5">Zasób</th>
                  <th className="p-5">S/N</th>
                  <th className="p-5">Status</th>
                  {isCommandLevel && <th className="p-5">Przypisano do</th>}
                  <th className="p-5 text-right font-black text-yellow-500/50">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {activeAssets.map(asset => (
                  <tr 
                    key={asset.id} 
                    data-testid={`asset-row-${asset.id}`}
                    className="hover:bg-zinc-900/50 transition-colors group"
                  >
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-yellow-500/50 transition-all">
                          <Package className="w-5 h-5 text-zinc-600 group-hover:text-yellow-500" />
                        </div>
                        <div>
                          <div className="font-black text-zinc-200 uppercase tracking-tight text-sm">{asset.name}</div>
                          <div className="text-[9px] text-zinc-600 font-bold uppercase">{asset.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={cn(
                        "font-mono font-bold px-2 py-0.5 text-[11px]",
                        asset.serialNumber && !asset.serialNumber.startsWith('x') 
                          ? "text-yellow-500 bg-yellow-500/5 border border-yellow-500/10" 
                          : "text-zinc-400 bg-zinc-900"
                      )}>
                        {asset.serialNumber?.startsWith('x') ? `${asset.serialNumber} szt.` : asset.serialNumber}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-1",
                        asset.status === 'Dostępny' ? "text-green-500 bg-green-500/5" :
                        asset.status === 'W użyciu' ? "text-blue-400 bg-blue-500/5" :
                        asset.status === 'W naprawie' ? "text-yellow-400 bg-yellow-500/5" :
                        "text-red-400 bg-red-500/5"
                      )}>{asset.status}</span>
                    </td>
                    {isCommandLevel && (
                      <td className="p-5">
                        {asset.assignedToName ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-zinc-600" />
                            <span className="text-sm text-zinc-300">{asset.assignedToName}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-sm">—</span>
                        )}
                      </td>
                    )}
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-2">
                        {/* Dispose button - only for own equipment or command */}
                        {(asset.createdBy === user?.id || isCommandLevel) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                data-testid={`dispose-asset-${asset.id}`}
                                className="text-zinc-600 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-zinc-950 border-zinc-800">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white uppercase font-black italic">Zutylizuj sprzęt</AlertDialogTitle>
                                <AlertDialogDescription className="text-zinc-500">
                                  Czy na pewno chcesz zutylizować <span className="text-yellow-500 font-bold">{asset.name}</span>?
                                  <br /><br />
                                  Sprzęt zostanie oznaczony jako "Zutylizowany" i nie będzie już widoczny w aktywnym wyposażeniu.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-white">Anuluj</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDisposeAsset(asset)} 
                                  className="bg-red-600 text-white uppercase font-black"
                                >
                                  Zutylizuj
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {activeAssets.length === 0 && (
                  <tr>
                    <td colSpan={isCommandLevel ? 5 : 4} className="p-10 text-center text-zinc-700 font-black uppercase italic tracking-widest text-sm">
                      {searchTerm ? 'Brak wyników wyszukiwania' : 'Brak aktywnego sprzętu'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Disposed Equipment - only for command */}
          {isCommandLevel && disposedAssets.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-zinc-600 uppercase tracking-[0.3em] mb-4">
                Sprzęt zutylizowany ({disposedAssets.length})
              </h3>
              <div className="bg-zinc-950/50 border border-zinc-900 rounded-none overflow-hidden opacity-60">
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-zinc-900">
                    {disposedAssets.map(asset => (
                      <tr key={asset.id} className="text-zinc-600">
                        <td className="p-4">
                          <span className="font-bold uppercase text-sm line-through">{asset.name}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-[11px]">{asset.serialNumber}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] font-black uppercase text-red-500/50">Zutylizowany</span>
                        </td>
                        <td className="p-4 text-sm">{asset.assignedToName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
