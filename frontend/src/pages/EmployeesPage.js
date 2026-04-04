import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, Search, Plus, Loader2, ChevronRight, Trash2 
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '../components/ui/select';
import { toast } from 'sonner';
import { HIERARCHY_GROUPS, POSITIONS, RANKS_CONFIG, validateBadgeNumber, cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function EmployeesPage() {
  const { user, canEditProfiles } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    badgeNumber: '',
    position: '',
    role: 'employee'
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/users/public`, { withCredentials: true });
      setEmployees(res.data);
    } catch (e) {
      toast.error('Błąd pobierania listy pracowników');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    // Walidacja numeru odznaki
    if (!validateBadgeNumber(newEmployee.badgeNumber)) {
      toast.error('Numer odznaki musi być liczbą od 1 do 999');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/users`, newEmployee, { withCredentials: true });
      toast.success('Pracownik został dodany!');
      setIsAddDialogOpen(false);
      setNewEmployee({
        email: '', password: '', firstName: '', lastName: '',
        badgeNumber: '', position: '', role: 'employee'
      });
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Błąd podczas dodawania');
    }
  };

  const handleDelete = async (e, empId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm("Czy na pewno chcesz usunąć tego funkcjonariusza z bazy danych?")) return;

    try {
      await axios.delete(`${API_URL}/api/users/${empId}`, { withCredentials: true });
      toast.success("Pracownik usunięty");
      fetchEmployees();
    } catch (err) {
      toast.error("Nie udało się usunąć pracownika");
    }
  };

  const filtered = employees.filter(emp => 
    `${emp.firstName} ${emp.lastName} ${emp.badgeNumber}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEmployeesByGroup = (groupName) => {
    const positions = HIERARCHY_GROUPS[groupName];
    return filtered.filter(emp => positions.includes(emp.position));
  };

  return (
    <div className="p-8 text-white animate-in fade-in duration-700" data-testid="employees-page">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic flex items-center gap-3">
            <ShieldCheck className="text-yellow-500 w-10 h-10" />
            Personel Departamentu
          </h1>
          <p className="text-zinc-500 font-bold mt-1 uppercase text-xs tracking-[0.3em]">
            Aktywne jednostki Department of Corrections
          </p>
        </div>

        {canEditProfiles && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                data-testid="add-employee-button"
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase px-8 py-6 rounded-none transition-all hover:scale-105 shadow-[0_0_20px_rgba(234,179,8,0.2)]"
              >
                <Plus className="w-5 h-5 mr-2 stroke-[4px]" /> Dodaj Pracownika
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase italic text-yellow-500">
                  Rejestracja Nowej Jednostki
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleAddEmployee} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Imię</Label>
                    <Input 
                      value={newEmployee.firstName}
                      onChange={(e) => setNewEmployee({...newEmployee, firstName: e.target.value})}
                      required 
                      data-testid="add-employee-firstname"
                      className="bg-zinc-900 border-zinc-800 rounded-none focus:border-yellow-500 text-white" 
                      placeholder="John" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Nazwisko</Label>
                    <Input 
                      value={newEmployee.lastName}
                      onChange={(e) => setNewEmployee({...newEmployee, lastName: e.target.value})}
                      required 
                      data-testid="add-employee-lastname"
                      className="bg-zinc-900 border-zinc-800 rounded-none focus:border-yellow-500 text-white" 
                      placeholder="Doe" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Nr Odznaki (1-999)</Label>
                    <Input 
                      value={newEmployee.badgeNumber}
                      onChange={(e) => setNewEmployee({...newEmployee, badgeNumber: e.target.value})}
                      required 
                      type="number"
                      min="1"
                      max="999"
                      data-testid="add-employee-badge"
                      className="bg-zinc-900 border-zinc-800 rounded-none focus:border-yellow-500 font-mono text-white" 
                      placeholder="101" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Ranga Służbowa</Label>
                    <Select
                      value={newEmployee.position}
                      onValueChange={(value) => setNewEmployee({...newEmployee, position: value})}
                    >
                      <SelectTrigger 
                        data-testid="add-employee-position"
                        className="bg-zinc-900 border-zinc-800 rounded-none text-white"
                      >
                        <SelectValue placeholder="Wybierz rangę..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {POSITIONS.map(pos => (
                          <SelectItem key={pos} value={pos} className="text-white focus:bg-zinc-800">
                            {pos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Email</Label>
                  <Input 
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    required 
                    data-testid="add-employee-email"
                    className="bg-zinc-900 border-zinc-800 rounded-none focus:border-yellow-500 text-white" 
                    placeholder="john.doe@doc.gov" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Hasło</Label>
                  <Input 
                    type="password"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                    required 
                    data-testid="add-employee-password"
                    className="bg-zinc-900 border-zinc-800 rounded-none focus:border-yellow-500 text-white" 
                    placeholder="••••••••" 
                  />
                </div>

                <Button 
                  type="submit" 
                  data-testid="add-employee-submit"
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase rounded-none mt-4 h-12 transition-all"
                >
                  Zatwierdź i Utwórz Profil
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <div className="relative mb-12 group max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-yellow-500 transition-colors" />
        <Input 
          placeholder="Szukaj po nazwisku lub odznace..." 
          className="pl-12 bg-zinc-950 border-zinc-800 h-14 text-lg focus:border-yellow-500 transition-all rounded-none border-2 shadow-2xl text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="employees-search"
        />
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-4 text-zinc-700">
           <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
           <p className="uppercase font-black tracking-widest">Inicjalizacja Bazy Danych...</p>
        </div>
      ) : (
        <div className="space-y-16">
          {Object.keys(HIERARCHY_GROUPS).map(groupName => {
            const groupMembers = getEmployeesByGroup(groupName);
            if (groupMembers.length === 0) return null;

            return (
              <section key={groupName} className="relative" data-testid={`group-${groupName.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.5em] whitespace-nowrap">
                    {groupName}
                  </h2>
                  <div className="h-[1px] w-full bg-zinc-900" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupMembers.map(emp => (
                    <EmployeeCard 
                      key={emp.id} 
                      emp={emp} 
                      canDelete={canEditProfiles} 
                      onDelete={handleDelete} 
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmployeeCard({ emp, canDelete, onDelete }) {
  const rankConfig = RANKS_CONFIG[emp.position] || { color: 'text-zinc-500' };

  return (
    <Link 
      to={`/profile/${emp.id}`}
      data-testid={`employee-row-${emp.id}`}
      className="bg-zinc-950 border border-zinc-800 p-5 group hover:border-yellow-500 transition-all relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {canDelete && (
           <button 
             onClick={(e) => onDelete(e, emp.id)}
             data-testid={`delete-employee-${emp.id}`}
             className="p-1 hover:text-red-500 transition-colors"
           >
             <Trash2 className="w-4 h-4" />
           </button>
        )}
        <ChevronRight className="w-4 h-4 text-yellow-500" />
      </div>
      
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-zinc-900 flex items-center justify-center font-mono text-lg font-black text-zinc-500 group-hover:text-yellow-500 border border-zinc-800 transition-colors">
          {emp.badgeNumber || '??'}
        </div>
        <div>
          <h3 className="font-black uppercase tracking-tighter text-zinc-200 group-hover:text-white transition-colors">
            {emp.firstName} {emp.lastName}
          </h3>
          <p className={cn("text-[10px] font-black uppercase tracking-widest", rankConfig.color)}>
            {emp.position}
          </p>
        </div>
      </div>
    </Link>
  );
}
