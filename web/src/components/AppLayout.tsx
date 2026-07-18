import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';

export default function AppLayout() {
  return (
    <div className="app-shell">
      <NavBar />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
