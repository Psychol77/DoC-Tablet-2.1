import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { Package, Plus, Search, Trash2, Edit, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CATEGORIES = ['Broń', 'Wyposażenie', 'Elektronika', 'Pojazdy', 'Odzież', 'Inne'];
const STATUSES = ['Dostępny', 'W użyciu', 'W naprawie', 'Niedostępny'];

export function EquipmentPage() {
  const { isFounder } = useAuth();
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newAsset, setNewAsset] = useState({
    name: '',
    serialNumber: '',
    category: 'Inne',
    status: 'Dostępny'
  });
  const [editAsset, setEditAsset] = useState({
    name: '',
    serialNumber: '',
    category: '',
    status: ''
  });

  useEffect(() => {
    fetchAssets();
    fetchEmployees();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/assets`, {
        withCredentials: true
      });
      setAssets(response.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Błąd podczas pobierania sprzętu');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`, {
        withCredentials: true
      });
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/assets`, newAsset, {
        withCredentials: true
      });
      toast.success('Sprzęt dodany pomyślnie');
      setIsAddDialogOpen(false);
      setNewAsset({ name: '', serialNumber: '', category: 'Inne', status: 'Dostępny' });
      fetchAssets();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Błąd podczas dodawania sprzętu';
      toast.error(msg);
    }
  };

  const handleEditAsset = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      await axios.put(`${API_URL}/api/assets/${selectedAsset.id}`, editAsset, {
        withCredentials: true
      });
      toast.success('Sprzęt zaktualizowany');
      setIsEditDialogOpen(false);
      setSelectedAsset(null);
      fetchAssets();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Błąd podczas aktualizacji';
      toast.error(msg);
    }
  };

  const handleDeleteAsset = async (assetId) => {
    try {
      await axios.delete(`${API_URL}/api/assets/${assetId}`, {
        withCredentials: true
      });
      toast.success('Sprzęt usunięty (wraz z przypisaniami)');
      fetchAssets();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Błąd podczas usuwania';
      toast.error(msg);
    }
  };

  const handleAssignAsset = async (e) => {
    e.preventDefault();
    if (!selectedAsset || !selectedUserId) return;
    try {
      await axios.post(`${API_URL}/api/assignments`, {
        assetId: selectedAsset.id,
        userId: selectedUserId
      }, {
        withCredentials: true
      });
      toast.success('Sprzęt przypisany');
      setIsAssignDialogOpen(false);
      setSelectedAsset(null);
      setSelectedUserId('');
      fetchAssets();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Błąd podczas przypisywania';
      toast.error(msg);
    }
  };

  const handleUnassignAsset = async (assetId) => {
    // Find the assignment first
    try {
      const response = await axios.get(`${API_URL}/api/assignments`, {
        withCredentials: true
      });
      const assignment = response.data.find(a => a.assetId === assetId);
      if (assignment) {
        await axios.delete(`${API_URL}/api/assignments/${assignment.id}`, {
          withCredentials: true
        });
        toast.success('Przypisanie usunięte');
        fetchAssets();
      }
    } catch (error) {
      const msg = error.response?.data?.detail || 'Błąd podczas usuwania przypisania';
      toast.error(msg);
    }
  };

  const openEditDialog = (asset) => {
    setSelectedAsset(asset);
    setEditAsset({
      name: asset.name,
      serialNumber: asset.serialNumber,
      category: asset.category,
      status: asset.status
    });
    setIsEditDialogOpen(true);
  };

  const openAssignDialog = (asset) => {
    setSelectedAsset(asset);
    setSelectedUserId('');
    setIsAssignDialogOpen(true);
  };

  const filteredAssets = assets.filter(asset => 
    `${asset.name} ${asset.serialNumber} ${asset.category}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8" data-testid="equipment-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-50 tracking-tight mb-2">Sprzęt</h1>
          <p className="text-zinc-400">Ewidencja sprzętu w systemie</p>
        </div>
        
        {isFounder && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                data-testid="add-asset-button"
                className="bg-yellow-400 text-zinc-950 hover:bg-yellow-500 font-bold rounded-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Dodaj sprzęt
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Dodaj nowy sprzęt</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddAsset} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider">Nazwa</Label>
                  <Input
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                    required
                    data-testid="add-asset-name"
                    className="bg-zinc-950 border-zinc-800 text-zinc-100"
                    placeholder="np. Kamizelka taktyczna"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider">Numer seryjny (S/N)</Label>
                  <Input
                    value={newAsset.serialNumber}
                    onChange={(e) => setNewAsset({...newAsset, serialNumber: e.target.value})}
                    required
                    data-testid="add-asset-serial"
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono"
                    placeholder="np. SN-2024-001"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase tracking-wider">Kategoria</Label>
                    <Select
                      value={newAsset.category}
                      onValueChange={(value) => setNewAsset({...newAsset, category: value})}
                    >
                      <SelectTrigger data-testid="add-asset-category" className="bg-zinc-950 border-zinc-800 text-zinc-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat} className="text-zinc-100 focus:bg-zinc-800">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase tracking-wider">Status</Label>
                    <Select
                      value={newAsset.status}
                      onValueChange={(value) => setNewAsset({...newAsset, status: value})}
                    >
                      <SelectTrigger data-testid="add-asset-status" className="bg-zinc-950 border-zinc-800 text-zinc-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {STATUSES.map(status => (
                          <SelectItem key={status} value={status} className="text-zinc-100 focus:bg-zinc-800">
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  data-testid="add-asset-submit"
                  className="w-full bg-yellow-400 text-zinc-950 hover:bg-yellow-500 font-bold"
                >
                  Dodaj sprzęt
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Szukaj po nazwie, numerze seryjnym lub kategorii..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="equipment-search"
            className="pl-10 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* Equipment Table */}
      {loading ? (
        <div className="text-center py-12 text-zinc-400">Ładowanie...</div>
      ) : (
        <div className="border border-zinc-800 rounded-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">Nazwa</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">S/N</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">Kategoria</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">Przypisany do</th>
                {isFounder && (
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-400">Akcje</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map(asset => (
                <tr 
                  key={asset.id} 
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                  data-testid={`asset-row-${asset.id}`}
                >
                  <td className="px-4 py-3 text-zinc-200">{asset.name}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded-sm border border-zinc-800">
                      {asset.serialNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{asset.category}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-sm text-xs font-medium uppercase ${
                      asset.status === 'Dostępny' 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : asset.status === 'W użyciu'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : asset.status === 'W naprawie'
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {asset.assignedToName || <span className="text-zinc-600">—</span>}
                  </td>
                  {isFounder && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!asset.assignedTo ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAssignDialog(asset)}
                            data-testid={`assign-asset-${asset.id}`}
                            className="text-zinc-400 hover:text-green-400"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnassignAsset(asset.id)}
                            data-testid={`unassign-asset-${asset.id}`}
                            className="text-zinc-400 hover:text-yellow-400"
                          >
                            Oddaj
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(asset)}
                          data-testid={`edit-asset-${asset.id}`}
                          className="text-zinc-400 hover:text-yellow-400"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`delete-asset-${asset.id}`}
                              className="text-zinc-400 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-zinc-100">Usuwanie sprzętu</AlertDialogTitle>
                              <AlertDialogDescription className="text-zinc-400">
                                Czy na pewno chcesz usunąć <span className="text-yellow-400 font-semibold">{asset.name}</span>?
                                <br /><br />
                                <span className="text-red-400 font-semibold">USUWANIE KASKADOWE:</span> System automatycznie usunie również wszystkie przypisania tego sprzętu.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700">
                                Anuluj
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAsset(asset.id)}
                                className="bg-red-500 text-white hover:bg-red-600"
                              >
                                Usuń
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredAssets.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Brak sprzętu do wyświetlenia</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edytuj sprzęt</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditAsset} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Nazwa</Label>
              <Input
                value={editAsset.name}
                onChange={(e) => setEditAsset({...editAsset, name: e.target.value})}
                required
                data-testid="edit-asset-name"
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Numer seryjny (S/N)</Label>
              <Input
                value={editAsset.serialNumber}
                onChange={(e) => setEditAsset({...editAsset, serialNumber: e.target.value})}
                required
                data-testid="edit-asset-serial"
                className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Kategoria</Label>
                <Select
                  value={editAsset.category}
                  onValueChange={(value) => setEditAsset({...editAsset, category: value})}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat} className="text-zinc-100 focus:bg-zinc-800">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Status</Label>
                <Select
                  value={editAsset.status}
                  onValueChange={(value) => setEditAsset({...editAsset, status: value})}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {STATUSES.map(status => (
                      <SelectItem key={status} value={status} className="text-zinc-100 focus:bg-zinc-800">
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              type="submit" 
              data-testid="edit-asset-submit"
              className="w-full bg-yellow-400 text-zinc-950 hover:bg-yellow-500 font-bold"
            >
              Zapisz zmiany
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Przypisz sprzęt</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignAsset} className="space-y-4 mt-4">
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-sm">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Sprzęt</p>
              <p className="text-zinc-200">{selectedAsset?.name}</p>
              <p className="text-xs text-zinc-500 font-mono mt-1">{selectedAsset?.serialNumber}</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Przypisz do pracownika</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger data-testid="assign-user-select" className="bg-zinc-950 border-zinc-800 text-zinc-100">
                  <SelectValue placeholder="Wybierz pracownika" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 max-h-60">
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id} className="text-zinc-100 focus:bg-zinc-800">
                      [{emp.badgeNumber}] {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              disabled={!selectedUserId}
              data-testid="assign-submit"
              className="w-full bg-yellow-400 text-zinc-950 hover:bg-yellow-500 font-bold disabled:opacity-50"
            >
              Przypisz
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EquipmentPage;
