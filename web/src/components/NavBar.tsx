import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  admin?: boolean;
}

const NAV: NavItem[] = [
  { to: '/recipes', label: 'Recipes', icon: '🍲' },
  { to: '/plan', label: 'Plan', icon: '🗓️' },
  { to: '/shopping-list', label: 'Shopping', icon: '🛒' },
  { to: '/admin/users', label: 'Users', icon: '👥', admin: true },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️', admin: true },
];

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV.filter((n) => !n.admin || user?.role === 'ADMIN');

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??';

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <header className="appbar">
        <NavLink to="/recipes" className="brand" aria-label="RecipeBox home">
          <span className="brand-mark" aria-hidden>🍅</span>
          <span>RecipeBox</span>
        </NavLink>

        <nav className="appbar-nav" aria-label="Primary">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="appbar-user">
          <div className="user-chip">
            <span className="avatar" aria-hidden>{initials}</span>
            <span className="who">
              {user?.email}
              {user && (
                <span className={`role-badge ${user.role === 'ADMIN' ? 'admin' : ''}`} style={{ marginLeft: 6 }}>
                  {user.role}
                </span>
              )}
            </span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout} data-testid="logout-btn">
            Log out
          </button>
        </div>
      </header>

      <nav className="tabbar" aria-label="Primary mobile">
        {items.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="tab-icon" aria-hidden>{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
