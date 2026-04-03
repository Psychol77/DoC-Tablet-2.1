import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  UserCircle,
  LogOut,
  History
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Panel główny', icon: LayoutDashboard },
  { path: '/equipment', label: 'Sprzęt', icon: Package },
  { path: '/employees', label: 'Wszyscy pracownicy', icon: Users },
  { path: '/profile', label: 'Mój profil', icon: UserCircle },
];

export function Sidebar() {
  const { user, logout, isFounder } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside 
      className="fixed left-0 top-0 h-full w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col z-40"
      data-testid="sidebar"
    >
      {/* Logo & Title */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <img 
            src="https://static.prod-images.emergentagent.com/jobs/55e7a3f8-51c4-4947-ad9f-521e5730ebf2/images/3981a70c4aa550c060c50b85595daba21b0780f677279179893c93e0deaf2e87.png"
            alt="DOC Logo"
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="text-sm font-bold text-zinc-50 leading-tight">System Department</h1>
            <h2 className="text-xs text-yellow-400 tracking-widest">OF CORRECTIONS</h2>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                data-testid={`nav-${path === '/' ? 'dashboard' : path.slice(1)}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors duration-150 ${
                    isActive
                      ? 'bg-zinc-800 text-yellow-400 border-l-2 border-yellow-400'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`
                }
              >
                <Icon className="w-5 h-5" strokeWidth={2} />
                <span className="text-sm font-medium">{label}</span>
              </NavLink>
            </li>
          ))}
          
          {isFounder && (
            <li>
              <NavLink
                to="/audit-log"
                data-testid="nav-audit-log"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors duration-150 ${
                    isActive
                      ? 'bg-zinc-800 text-yellow-400 border-l-2 border-yellow-400'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`
                }
              >
                <History className="w-5 h-5" strokeWidth={2} />
                <span className="text-sm font-medium">Historia zmian</span>
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-zinc-800">
        <div className="mb-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Zalogowany jako</p>
          <p className="text-sm font-medium text-zinc-200">
            [{user?.badgeNumber}] {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-zinc-500">{user?.position}</p>
        </div>
        <button
          onClick={handleLogout}
          data-testid="logout-button"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-sm transition-colors duration-150"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Wyloguj</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
