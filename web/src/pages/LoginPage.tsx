import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };
  const dest = location.state?.from?.pathname ?? '/recipes';

  const [email, setEmail] = useState('cook@recipebox.test');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="auth-brand">
          <div className="brand-mark" aria-hidden>🍅</div>
          <h1>Welcome back</h1>
          <p className="subtitle">Sign in to RecipeBox</p>
        </div>

        {error && <div className="error-banner" data-testid="login-error">{error}</div>}

        <form onSubmit={submit} data-testid="login-form">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" data-testid="login-email"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" data-testid="login-password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="demo-hint">
          <strong>Demo accounts</strong><br />
          Cook: <code>cook@recipebox.test</code> · <code>password123</code><br />
          Admin: <code>admin@recipebox.test</code> · <code>password123</code>
        </div>

        <p className="auth-switch">
          No account yet? <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}
