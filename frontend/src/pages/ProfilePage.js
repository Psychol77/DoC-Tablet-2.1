import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Award, BookOpen, Package, Save, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TRAININGS = [
  { key: 'OPP', label: 'OPP' },
  { key: 'KPP', label: 'KPP' },
  { key: 'Strzelanie', label: 'Strzelanie' },
  { key: 'Taktyka', label: 'Taktyka' },
  { key: 'Prawo', label: 'Prawo' },
  { key: 'PierwszaPomoc', label: 'Pierwsza Pomoc' },
];

const POSITIONS = [
  'Warden', 'D. Warden', 'AoW',
  'Captain', 'Lieutenant',
  'Sergeant',
  'PO III', 'PO II', 'PO I', 'Kadet'
];

// Officers ranks - read-only own profile
const OFFICERS_POSITIONS = ['Sergeant', 'PO III', 'PO II', 'PO I', 'Kadet'];

export function ProfilePage() {
  const { userId } = useParams();
  const { user: currentUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meritBars, setMeritBars] = useState(['', '', '', '', '', '']);
  const [trainings, setTrainings] = useState({});
  const [badgeNumber, setBadgeNumber] = useState('');
  const [position, setPosition] = useState('');
  
  // Equipment dialog state
  const [isAddEquipmentOpen, setIsAddEquipmentOpen] = useState(false);
  const [isEditEquipmentOpen, setIsEditEquipmentOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [newEquipment, setNewEquipment] = useState({ name: '', serialNumber: '' });
  const [editEquipment, setEditEquipment] = useState({ name: '', serialNumber: '' });

  const targetUserId = userId || currentUser?.id;
  const isOwnProfile = !userId || userId === currentUser?.id;
  
  // Permission logic based on position hierarchy
  const isOfficerRank = OFFICERS_POSITIONS.includes(currentUser?.position);
  const canEditProfiles = currentUser?.role === 'founder' || currentUser?.canEditProfiles;
  
  // Can edit this profile if:
  // - Current user is management (Board/Command) and viewing someone else's profile
  // - Current user is management viewing their own profile (they can edit their own)
  // - Current user is founder
  // Officers (Kadet, PO I-III, Sergeant) can NEVER edit their own profile
  const canEditThisProfile = isOwnProfile 
    ? (canEditProfiles && !isOfficerRank)  // Own profile: only if management AND not officer rank
    : canEditProfiles;  // Other's profile: only if has edit permissions

  useEffect(() => {
    if (targetUserId) {
      fetchProfile();
      fetchAssignments();
    }
  }, [targetUserId]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users/${targetUserId}`, {
        withCredentials: true
      });
      const data = response.data;
      setProfile(data);
      setMeritBars(data.meritBars || ['', '', '', '', '', '']);
      setTrainings(data.trainings || {});
      setBadgeNumber(data.badgeNumber || '');
      setPosition(data.position || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Błąd podczas pobierania profilu');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/assignments/user/${targetUserId}`, {
        withCredentials: true
      });
      const assignmentsWithDetails = await Promise.all(
        response.data.map(async (assignment) => {
          try {
            const assetResponse = await axios.get(`${API_URL}/api/assets/${assignment.assetId}`, {
              withCredentials: true
            });
            return {
              ...assignment,
              createdBy: assetResponse.data.createdBy
            };
          } catch {
            return assignment;
          }
        })
      );
      setAssignments(assignmentsWithDetails);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleSave = async () => {
    if (!canEditThisProfile) return;
    setSaving(true);
    try {
      const updateData = {
        meritBars,
        trainings
      };
      
      // Only include badge and position if user can edit profiles (management)
      if (canEditProfiles) {
        updateData.badgeNumber = badgeNumber;
        updateData.position = position;
      }
      
      await axios.put(`${API_URL}/api/users/${targetUserId}`, updateData, {
        withCredentials: true
      });
      toast.success('Profil zaktualizowany');
      if (isOwnProfile) {
        await refreshUser();
      }
      fetchProfile();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Błąd podczas zapisywania';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTrainingChange = (key, checked) => {
    if (!canEditThisProfile) return;
    setTrainings(prev => ({ ...prev, [key]: checked }));
  };

  const handleMeritBarChange = (index, value) => {
    if (!canEditThisProfile) return;
    const newBars = [...meritBars];
    newBars[index] = value;
    setMeritBars(newBars);
  };

  // Equipment management
  const handleAddEquipment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/assets/my-equipment`, {
        name: newEquipment.name,
        serialNumber: newEquipment.serialNumber,
        category: 'Inne',
        status: 'W użyciu'
      }, {
        withCredentials: true
      });
      toast.success('Sprzęt dodany i przypisany');
      setIsAddEquipmentOpen(false);
      setNewEquipment({ name: '', serialNumber: '' });
      fetchAssignments();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Błąd podczas dodawania sprzętu';
      toast.error(msg);
    }
  };

  const handleEditEquipment = async (e) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    try {
      await axios.put(`${API_URL}/api/assets/${selectedEquipment.assetId}`, {
        name: editEquipment.name,
        serialNumber: editEquipment.serialNumber,
        category: 'Inne',
        status: 'W użyciu'
      }, {
        withCredentials: true
      });
      toast.success('Sprzęt zaktualizowany');
      setIsEditEquipmentOpen(false);
      setSelectedEquipment(null);
      fetchAssignments();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Błąd podczas aktualizacji';
      toast.error(msg);
    }
  };

  const handleDeleteEquipment = async (assetId) => {
    try {
      await axios.delete(`${API_URL}/api/assets/${assetId}`, {
        withCredentials: true
      });
      toast.success('Sprzęt usunięty');
      fetchAssignments();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Błąd podczas usuwania';
      toast.error(msg);
    }
  };

  const openEditEquipmentDialog = (assignment) => {
    setSelectedEquipment(assignment);
    setEditEquipment({
      name: assignment.assetName,
      serialNumber: assignment.assetSerialNumber
    });
    setIsEditEquipmentOpen(true);
  };

  const canEditEquipmentItem = (assignment) => {
    if (currentUser?.role === 'founder' || canEditProfiles) return true;
    return isOwnProfile && assignment.createdBy === currentUser?.id;
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12 text-zinc-400">Ładowanie profilu...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12 text-zinc-400">Profil nie znaleziony</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8" data-testid="profile-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl font-mono font-bold text-yellow-400">[{profile.badgeNumber}]</span>
            <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">
              {profile.firstName} {profile.lastName}
            </h1>
          </div>
          <p className="text-zinc-400">
            {profile.position} • {profile.role === 'founder' ? 'Founder' : 'Employee'}
          </p>
          <p className="text-zinc-500 text-sm mt-1">
            {canEditThisProfile ? 'Możesz edytować ten profil' : 'Widok tylko do odczytu'}
          </p>
        </div>
        
        {canEditThisProfile && (
          <Button 
            onClick={handleSave}
            disabled={saving}
            data-testid="save-profile-button"
            className="bg-yellow-400 text-zinc-950 hover:bg-yellow-500 font-bold rounded-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </Button>
        )}
      </div>

      {/* Read-only notice for officers */}
      {isOwnProfile && isOfficerRank && (
        <div className="mb-6 p-4 bg-yellow-400/10 border border-yellow-400/20 rounded-sm">
          <p className="text-yellow-400 text-sm">
            Jako funkcjonariusz niższego stopnia nie możesz edytować własnego profilu. Skontaktuj się z przełożonym w celu wprowadzenia zmian.
          </p>
        </div>
      )}

      {/* Management can edit badge and position */}
      {canEditThisProfile && canEditProfiles && !isOwnProfile && (
        <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-sm">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4">Dane służbowe</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-1 block">Numer odznaki</Label>
              <Input
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                data-testid="edit-badge-number"
                className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-1 block">Stopień</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger data-testid="edit-position" className="bg-zinc-950 border-zinc-800 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {POSITIONS.map(pos => (
                    <SelectItem key={pos} value={pos} className="text-zinc-100 focus:bg-zinc-800">
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trainings */}
        <div className="border border-zinc-800 bg-zinc-900 rounded-sm p-6">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zinc-800">
            <BookOpen className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Szkolenia</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {TRAININGS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={`training-${key}`}
                  checked={trainings[key] || false}
                  onCheckedChange={(checked) => handleTrainingChange(key, checked)}
                  disabled={!canEditThisProfile}
                  data-testid={`training-${key}`}
                  className="border-zinc-600 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
                />
                <Label 
                  htmlFor={`training-${key}`}
                  className={`text-sm ${trainings[key] ? 'text-zinc-200' : 'text-zinc-500'} ${!canEditThisProfile ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Merit Bars */}
        <div className="border border-zinc-800 bg-zinc-900 rounded-sm p-6">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zinc-800">
            <Award className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Paski Zasługi</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {meritBars.map((bar, index) => (
              <div key={index}>
                <Label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">
                  Pasek {index + 1}
                </Label>
                <Input
                  value={bar}
                  onChange={(e) => handleMeritBarChange(index, e.target.value)}
                  disabled={!canEditThisProfile}
                  data-testid={`merit-bar-${index}`}
                  placeholder="—"
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div className="border border-zinc-800 bg-zinc-900 rounded-sm p-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-zinc-100">Wyposażenie</h2>
            </div>
            
            {isOwnProfile && (
              <Dialog open={isAddEquipmentOpen} onOpenChange={setIsAddEquipmentOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm"
                    data-testid="add-my-equipment-button"
                    className="bg-yellow-400 text-zinc-950 hover:bg-yellow-500 font-bold rounded-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Dodaj
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Dodaj własny sprzęt</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddEquipment} className="space-y-4 mt-4">
                    <p className="text-sm text-zinc-400">
                      Sprzęt zostanie automatycznie przypisany do Ciebie i pojawi się w ewidencji.
                    </p>
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs uppercase tracking-wider">Nazwa</Label>
                      <Input
                        value={newEquipment.name}
                        onChange={(e) => setNewEquipment({...newEquipment, name: e.target.value})}
                        required
                        data-testid="add-my-equipment-name"
                        className="bg-zinc-950 border-zinc-800 text-zinc-100"
                        placeholder="np. Latarka taktyczna"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs uppercase tracking-wider">Numer seryjny (S/N)</Label>
                      <Input
                        value={newEquipment.serialNumber}
                        onChange={(e) => setNewEquipment({...newEquipment, serialNumber: e.target.value})}
                        required
                        data-testid="add-my-equipment-serial"
                        className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono"
                        placeholder="np. LT-2024-001"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      data-testid="add-my-equipment-submit"
                      className="w-full bg-yellow-400 text-zinc-950 hover:bg-yellow-500 font-bold"
                    >
                      Dodaj sprzęt
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          
          {assignments.length === 0 ? (
            <p className="text-zinc-500 text-sm">Brak przypisanego sprzętu</p>
          ) : (
            <div className="space-y-3">
              {assignments.map(assignment => (
                <div 
                  key={assignment.id}
                  className="p-3 bg-zinc-950 border border-zinc-800 rounded-sm"
                  data-testid={`assigned-item-${assignment.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-zinc-200 font-medium">{assignment.assetName}</p>
                      <p className="font-mono text-xs text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded-sm border border-zinc-800 inline-block mt-1">
                        {assignment.assetSerialNumber}
                      </p>
                    </div>
                    
                    {canEditEquipmentItem(assignment) && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditEquipmentDialog(assignment)}
                          data-testid={`edit-my-equipment-${assignment.id}`}
                          className="text-zinc-400 hover:text-yellow-400 h-7 w-7 p-0"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`delete-my-equipment-${assignment.id}`}
                              className="text-zinc-400 hover:text-red-400 h-7 w-7 p-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-zinc-100">Usuwanie sprzętu</AlertDialogTitle>
                              <AlertDialogDescription className="text-zinc-400">
                                Czy na pewno chcesz usunąć <span className="text-yellow-400 font-semibold">{assignment.assetName}</span>?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700">
                                Anuluj
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteEquipment(assignment.assetId)}
                                className="bg-red-500 text-white hover:bg-red-600"
                              >
                                Usuń
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Equipment Dialog */}
      <Dialog open={isEditEquipmentOpen} onOpenChange={setIsEditEquipmentOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edytuj sprzęt</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditEquipment} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Nazwa</Label>
              <Input
                value={editEquipment.name}
                onChange={(e) => setEditEquipment({...editEquipment, name: e.target.value})}
                required
                data-testid="edit-my-equipment-name"
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Numer seryjny (S/N)</Label>
              <Input
                value={editEquipment.serialNumber}
                onChange={(e) => setEditEquipment({...editEquipment, serialNumber: e.target.value})}
                required
                data-testid="edit-my-equipment-serial"
                className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono"
              />
            </div>
            <Button 
              type="submit" 
              data-testid="edit-my-equipment-submit"
              className="w-full bg-yellow-400 text-zinc-950 hover:bg-yellow-500 font-bold"
            >
              Zapisz zmiany
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProfilePage;
