import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Users, Plus, Search, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const POSITIONS = [
  'Warden', 'D. Warden', 'AoW',
  'Captain',
  'Lieutenant',
  'Sergeant',
  'PO III', 'PO II', 'PO I', 'Kadet'
];

const HIERARCHY_GROUPS = {
  'BOARD': ['Warden', 'D. Warden', 'AoW'],
  'HIGH COMMAND': ['Captain'],
  'COMMAND': ['Lieutenant'],
  'SERGEANT': ['Sergeant'],
  'OFFICERS': ['PO III', 'PO II', 'PO I', 'Kadet']
};

export function EmployeesPage() {
  const { isFounder } = useAuth();
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
      const response = await axios.get(`${API_URL}/api/users`, {
        withCredentials: true
      });
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Błąd podczas pobierania pracowników');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/users`, newEmployee, {
        withCredentials: true
      });
      toast.success('Pracownik dodany pomyślnie');
      setIsAddDialogOpen(false);
      setNewEmployee({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        badgeNumber: '',
        position: '',
        role: 'employee'
      });
      fetchEmployees();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Błąd podczas dodawania pracownika';
      toast.error(msg);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    `${emp.firstName} ${emp.lastName} ${emp.badgeNumber}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEmployeesByGroup = (group) => {
    const positions = HIERARCHY_GROUPS[group];
    return filteredEmployees.filter(emp => positions.includes(emp.position));
  };

  return (
    <div className="p-6 lg:p-8" data-testid="employees-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-50 tracking-tight mb-2">Wszyscy pracownicy</h1>
          <p className="text-zinc-400">Lista wszystkich funkcjonariuszy w systemie</p>
        </div>
        
        {isFounder && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                data-testid="add-employee-button"
                className="bg-yellow-400 text-zinc-950 hover:bg-yellow-500 font-bold rounded-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Dodaj pracownika
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Dodaj nowego pracownika</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddEmployee} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase tracking-wider">Imię</Label>
                    <Input
                      value={newEmployee.firstName}
                      onChange={(e) => setNewEmployee({...newEmployee, firstName: e.target.value})}
                      required
                      data-testid="add-employee-firstname"
                      className="bg-zinc-950 border-zinc-800 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase tracking-wider">Nazwisko</Label>
                    <Input
                      value={newEmployee.lastName}
                      onChange={(e) => setNewEmployee({...newEmployee, lastName: e.target.value})}
                      required
                      data-testid="add-employee-lastname"
                      className="bg-zinc-950 border-zinc-800 text-zinc-100"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase tracking-wider">Numer odznaki</Label>
                    <Input
                      value={newEmployee.badgeNumber}
                      onChange={(e) => setNewEmployee({...newEmployee, badgeNumber: e.target.value})}
                      required
                      data-testid="add-employee-badge"
                      className="bg-zinc-950 border-zinc-800 text-zinc-100"
                      placeholder="np. 1234"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase tracking-wider">Stopień</Label>
                    <Select
                      value={newEmployee.position}
                      onValueChange={(value) => setNewEmployee({...newEmployee, position: value})}
                    >
                      <SelectTrigger 
                        data-testid="add-employee-position"
                        className="bg-zinc-950 border-zinc-800 text-zinc-100"
                      >
                        <SelectValue placeholder="Wybierz stopień" />
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

                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider">Email</Label>
                  <Input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    required
                    data-testid="add-employee-email"
                    className="bg-zinc-950 border-zinc-800 text-zinc-100"
                    placeholder="email@doc.gov"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider">Hasło</Label>
                  <Input
                    type="password"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                    required
                    data-testid="add-employee-password"
                    className="bg-zinc-950 border-zinc-800 text-zinc-100"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider">Rola</Label>
                  <Select
                    value={newEmployee.role}
                    onValueChange={(value) => setNewEmployee({...newEmployee, role: value})}
                  >
                    <SelectTrigger 
                      data-testid="add-employee-role"
                      className="bg-zinc-950 border-zinc-800 text-zinc-100"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="employee" className="text-zinc-100 focus:bg-zinc-800">Employee</SelectItem>
                      <SelectItem value="founder" className="text-zinc-100 focus:bg-zinc-800">Founder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  data-testid="add-employee-submit"
                  className="w-full bg-yellow-400 text-zinc-950 hover:bg-yellow-500 font-bold"
                >
                  Dodaj pracownika
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
            placeholder="Szukaj po imieniu, nazwisku lub odznace..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="employees-search"
            className="pl-10 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* Employee List by Hierarchy */}
      {loading ? (
        <div className="text-center py-12 text-zinc-400">Ładowanie...</div>
      ) : (
        <div className="space-y-2">
          {Object.keys(HIERARCHY_GROUPS).map(group => {
            const groupEmployees = getEmployeesByGroup(group);
            if (groupEmployees.length === 0) return null;
            
            return (
              <div key={group} data-testid={`group-${group.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="group-header">
                  {group}
                </div>
                <div className="border border-zinc-800 rounded-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-zinc-900 border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Funkcjonariusz
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Stopień
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Akcje
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupEmployees.map(emp => (
                        <tr 
                          key={emp.id} 
                          className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                          data-testid={`employee-row-${emp.id}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-yellow-400 font-bold">[{emp.badgeNumber}]</span>
                              <span className="text-zinc-200">{emp.firstName} {emp.lastName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-zinc-300">{emp.position}</td>
                          <td className="px-4 py-3">
                            <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-sm text-xs font-medium uppercase">
                              Aktywny
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link to={`/profile/${emp.id}`}>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                data-testid={`view-profile-${emp.id}`}
                                className="text-zinc-400 hover:text-yellow-400"
                              >
                                <UserCircle className="w-4 h-4 mr-1" />
                                Profil
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          
          {filteredEmployees.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Brak pracowników do wyświetlenia</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EmployeesPage;
