// Route-verifiability contract (Colossus): every navigable UI state MUST be reachable
// from a URL alone (deep-linkable BrowserRouter routes; nginx serves try_files fallback).
// Keep data-testid="app-ready" on the shell root — the mockup gate waits for it.
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import RequireAuth from './auth/RequireAuth';
import RequireAdmin from './auth/RequireAdmin';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import RecipeListPage from './pages/RecipeListPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import RecipeEditPage from './pages/RecipeEditPage';
import PlanPage from './pages/PlanPage';
import ShoppingListPage from './pages/ShoppingListPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <div data-testid="app-ready">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Navigate to="/recipes" replace />} />
            <Route path="/recipes" element={<RecipeListPage />} />
            <Route path="/recipes/new" element={<RecipeEditPage />} />
            <Route path="/recipes/:id" element={<RecipeDetailPage />} />
            <Route path="/recipes/:id/edit" element={<RecipeEditPage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/shopping-list" element={<ShoppingListPage />} />
            <Route path="/admin/users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
            <Route path="/admin/settings" element={<RequireAdmin><AdminSettingsPage /></RequireAdmin>} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
