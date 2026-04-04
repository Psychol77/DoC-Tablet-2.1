import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { MERIT_BARS, TRAININGS, RANKS_CONFIG, POSITIONS, validateBadgeNumber, cn } from '../lib/utils';
import { Loader2, ShieldAlert, Package, Award, User, ShieldCheck, Settings2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
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

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Officers ranks - read-only own profile
const OFFICERS_POSITIONS = ['Sergeant', 'PO III', 'PO II', 'PO I', 'Kadet'];

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: loggedInUser, refreshUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [userAssets, setUserAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editable fields
  const [meritBars, setMeritBars] = useState([false, false, false, false, false, false]);
  const [trainings, setTrainings] = useState({});
  const [badgeNumber, setBadgeNumber] = useState('');
  const [position, setPosition] = useState('');
  
  // Equipment dialog
  const [isAddEquipmentOpen, setIsAddEquipmentOpen] = useState(false);
  const [newEquipment, setNewEquipment] = useState({ name: '', serialNumber: '' });

  const targetId = userId || loggedInUser?.id;
  const isOwnProfile = !userId || userId === loggedInUser?.id;
  
  // Permission logic
  const isOfficerRank = OFFICERS_POSITIONS.includes(loggedInUser?.position);
  const canEditProfiles = loggedInUser?.role === 'founder' || loggedInUser?.canEditProfiles;
  
  // Can edit this profile if management viewing someone else, or management viewing their own (not officer)
  const canEditThisProfile = isOwnProfile 
    ? (canEditProfiles && !isOfficerRank)
    : canEditProfiles;

  useEffect(() => {
    if (targetId) {
      fetchProfile();
      fetchUserAssets();
    }
  }, [targetId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const userRes = await axios.get(`${API_URL}/api/users/${targetId}`, { withCredentials: true });
      const foundUser = userRes.data;
      
      if (foundUser) {
        setProfileData(foundUser);
        // Handle meritBars - convert to boolean array if needed
        const bars = foundUser.meritBars || [];
        if (typeof bars[0] === 'boolean') {
          setMeritBars(bars);
        } else {
          // Legacy: convert string array to boolean (check if has value)
          setMeritBars(bars.map(b => Boolean(b && b.trim())));
        }
        setTrainings(foundUser.trainings || {});
        setBadgeNumber(foundUser.badgeNumber || '');
        setPosition(foundUser.position || '');
      }
    } catch (error) {
      toast.error("Błąd podczas ładowania profilu");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAssets = async () => {
    try {
      const assetsRes = await axios.get(`${API_URL}/api/assets`, { withCredentials: true });
      // Filter assets assigned to this user and not disposed
      const assignedAssets = assetsRes.data.filter(asset => 
        asset.assignedTo && String(asset.assignedTo) === String(targetId) && asset.status !== 'Zutylizowany'
      );
      setUserAssets(assignedAssets);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const handleSave = async () => {
    if (!canEditThisProfile) return;
    
    // Validate badge number
    if (badgeNumber && !validateBadgeNumber(badgeNumber)) {
      toast.error('Numer odznaki musi być liczbą od 1 do 999');
      return;
    }
    
    setSaving(true);
    try {
      const updateData = {
        meritBars,
        trainings
      };
      
      if (canEditProfiles && !isOwnProfile) {
        updateData.badgeNumber = badgeNumber;
        updateData.position = position;
      }
      
      await axios.put(`${API_URL}/api/users/${targetId}`, updateData, { withCredentials: true });
      toast.success("Zaktualizowano akta");
      
      if (isOwnProfile) {
        await refreshUser();
      }
      fetchProfile();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  };

  const toggleMeritBar = (index) => {
    if (!canEditThisProfile) return;
    const newBars = [...meritBars];
    newBars[index] = !newBars[index];
    setMeritBars(newBars);
  };

  const toggleTraining = (key) => {
    if (!canEditThisProfile) return;
    setTrainings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Equipment management - only for own profile
  const handleAddEquipment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/assets/my-equipment`, {
        name: newEquipment.name,
        serialNumber: newEquipment.serialNumber,
        category: 'Inne',
        status: 'W użyciu'
      }, { withCredentials: true });
      
      toast.success('Sprzęt dodany i przypisany');
      setIsAddEquipmentOpen(false);
      setNewEquipment({ name: '', serialNumber: '' });
      fetchUserAssets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Błąd podczas dodawania');
    }
  };

  const handleDisposeEquipment = async (assetId, assetName) => {
    try {
      await axios.put(`${API_URL}/api/assets/${assetId}`, {
        name: assetName,
        serialNumber: userAssets.find(a => a.id === assetId)?.serialNumber || '',
        category: 'Inne',
        status: 'Zutylizowany'
      }, { withCredentials: true });
      
      toast.success('Sprzęt zutylizowany');
      fetchUserAssets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Błąd podczas utylizacji');
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-zinc-950">
      <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
    </div>
  );

  if (!profileData) return (
    <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-4 text-center">
      <ShieldAlert className="w-16 h-16 text-red-500 mb-4 opacity-50" />
      <h1 className="text-xl font-black uppercase">Błąd dostępu do akt</h1>
    </div>
  );

  return (
    <div className="p-8 text-white min-h-screen animate-in fade-in duration-500" data-testid="profile-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-yellow-500/20 pb-6 mb-8 gap-4">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center">
             <User className="w-12 h-12 text-zinc-700" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">Akta Osobowe</h1>
            <p className="text-yellow-500 font-black text-2xl mt-2 uppercase flex items-center gap-3">
              {profileData.firstName} {profileData.lastName} 
              <span className="text-zinc-600 font-mono text-xl">#{profileData.badgeNumber}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-[10px] text-zinc-500 font-mono tracking-widest uppercase bg-zinc-900/50 p-3 border border-zinc-800">
            <p>Dept: DOC / Prison Authority</p>
            <p>Dostęp: {canEditThisProfile ? 'ADMINISTRATOR' : 'TYLKO ODCZYT'}</p>
          </div>
          {canEditThisProfile && (
            <Button 
              onClick={handleSave}
              disabled={saving}
              data-testid="save-profile-button"
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase px-6 py-3 rounded-none"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Zapisz'}
            </Button>
          )}
        </div>
      </div>

      {/* Read-only notice */}
      {isOwnProfile && isOfficerRank && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-none">
          <p className="text-yellow-500 text-sm font-bold uppercase">
            Jako funkcjonariusz niższego stopnia nie możesz edytować własnego profilu.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* PANEL ADMINA - tylko dla zarządzających oglądających cudzy profil */}
          {canEditThisProfile && canEditProfiles && !isOwnProfile && (
            <section className="bg-zinc-900/40 border border-yellow-500/20 p-6">
              <h2 className="text-xs font-black text-yellow-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Panel Zarządzania
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Nr Odznaki (1-999)</label>
                  <Input 
                    type="number"
                    min="1"
                    max="999"
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value)}
                    data-testid="edit-badge-number"
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white font-mono rounded-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Stopień</label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger data-testid="edit-position" className="bg-zinc-950 border-zinc-800 rounded-none text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {POSITIONS.map(r => (
                        <SelectItem key={r} value={r} className="text-white focus:bg-zinc-800">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          )}

          {/* Ewidencja sprzętu */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <Package className="w-4 h-4 text-yellow-500" /> Ewidencja Wyposażenia
              </h2>
              
              {isOwnProfile && (
                <Dialog open={isAddEquipmentOpen} onOpenChange={setIsAddEquipmentOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm"
                      data-testid="add-my-equipment-button"
                      className="bg-yellow-500 text-black font-black uppercase rounded-none hover:bg-yellow-400"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Dodaj
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold uppercase text-yellow-500">Dodaj własny sprzęt</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddEquipment} className="space-y-4 mt-4">
                      <p className="text-sm text-zinc-400">
                        Sprzęt zostanie automatycznie przypisany do Ciebie.
                      </p>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Nazwa</Label>
                        <Input
                          value={newEquipment.name}
                          onChange={(e) => setNewEquipment({...newEquipment, name: e.target.value})}
                          required
                          data-testid="add-my-equipment-name"
                          className="bg-zinc-900 border-zinc-800 text-white rounded-none"
                          placeholder="np. Latarka taktyczna"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Numer Seryjny (S/N)</Label>
                        <Input
                          value={newEquipment.serialNumber}
                          onChange={(e) => setNewEquipment({...newEquipment, serialNumber: e.target.value})}
                          required
                          data-testid="add-my-equipment-serial"
                          className="bg-zinc-900 border-zinc-800 text-white font-mono rounded-none"
                          placeholder="np. LT-2024-001"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        data-testid="add-my-equipment-submit"
                        className="w-full bg-yellow-500 text-black font-black uppercase rounded-none"
                      >
                        Dodaj sprzęt
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userAssets.length > 0 ? (
                userAssets.map((item) => (
                  <div 
                    key={item.id} 
                    data-testid={`assigned-item-${item.id}`}
                    className="bg-zinc-950 border-l-4 border-l-yellow-500 border border-zinc-800 p-4 flex justify-between items-start"
                  >
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-black">{item.category}</p>
                      <p className="text-lg font-black text-zinc-100 uppercase italic">{item.name}</p>
                      <p className="font-mono text-[10px] text-yellow-500/80 mt-2">S/N: {item.serialNumber}</p>
                    </div>
                    
                    {(isOwnProfile && item.createdBy === loggedInUser?.id) || canEditProfiles ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            data-testid={`dispose-equipment-${item.id}`}
                            className="text-zinc-500 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-950 border-zinc-800">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white uppercase font-black">Zutylizuj sprzęt</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-400">
                              Czy na pewno chcesz zutylizować <span className="text-yellow-500 font-bold">{item.name}</span>?
                              <br /><br />
                              Sprzęt zostanie oznaczony jako "Zutylizowany" i nie będzie już widoczny w aktywnym wyposażeniu.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-white">Anuluj</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDisposeEquipment(item.id, item.name)}
                              className="bg-red-600 text-white uppercase font-black"
                            >
                              Zutylizuj
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="col-span-full border border-dashed border-zinc-800 p-8 text-center text-zinc-600 uppercase font-bold text-xs">
                  Brak przypisanego sprzętu w bazie
                </div>
              )}
            </div>
          </section>

          {/* Szkolenia */}
          <section className="bg-zinc-950 border border-zinc-800 p-6">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">Certyfikaty i Szkolenia</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {TRAININGS.map(({ key, label }) => (
                <button 
                  key={key}
                  onClick={() => toggleTraining(key)}
                  disabled={!canEditThisProfile}
                  data-testid={`training-${key}`}
                  className={cn(
                    "flex items-center gap-3 p-3 border text-left transition-all",
                    trainings[key] 
                      ? "border-green-500 bg-green-500/5 text-green-500" 
                      : "border-zinc-900 text-zinc-700",
                    !canEditThisProfile && "cursor-default opacity-50"
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full", trainings[key] ? "bg-green-500" : "bg-zinc-800")} />
                  <span className="text-[10px] font-black uppercase">{label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Pasek boczny */}
        <div className="space-y-6">
          {/* Aktualny stopień */}
          <div className="bg-yellow-500 p-6 text-black relative overflow-hidden group">
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-70">Aktualny Stopień</h3>
            <p className="text-4xl font-black uppercase italic tracking-tighter leading-none relative z-10">{profileData.position}</p>
            <div className="mt-4 pt-4 border-t border-black/10 flex justify-between items-center font-bold text-sm relative z-10">
              <span>ODZNAKA:</span>
              <span className="font-mono text-xl">#{profileData.badgeNumber}</span>
            </div>
            <ShieldCheck className="absolute -right-4 -bottom-4 w-24 h-24 text-black/10" />
          </div>

          {/* Paski Zasługi - 6 checkboxów */}
          <div className="bg-zinc-950 border border-zinc-800 p-6">
             <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-500" /> Paski Zasługi
             </h3>
             <div className="space-y-3">
                {MERIT_BARS.map((merit, index) => (
                  <button 
                    key={merit}
                    onClick={() => toggleMeritBar(index)}
                    disabled={!canEditThisProfile}
                    data-testid={`merit-bar-${index}`}
                    className={cn(
                      "w-full text-left p-3 border text-[10px] font-black uppercase transition-all flex items-center gap-3",
                      meritBars[index]
                        ? "border-yellow-500 bg-yellow-500/10 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.1)]"
                        : "border-zinc-900 text-zinc-700",
                      !canEditThisProfile && "cursor-default opacity-50"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 border-2 flex items-center justify-center",
                      meritBars[index] ? "border-yellow-500 bg-yellow-500" : "border-zinc-700"
                    )}>
                      {meritBars[index] && <span className="text-black text-[8px]">✓</span>}
                    </div>
                    {merit}
                  </button>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
