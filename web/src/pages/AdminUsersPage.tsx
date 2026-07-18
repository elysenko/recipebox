import { useEffect, useState } from 'react';
import type { User } from '../lib/types';
import { listUsers } from '../lib/mockStore';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    listUsers().then((u) => { if (alive) { setUsers(u); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  return (
    <div data-testid="admin-users-page">
      <div className="page-head">
        <div className="grow">
          <h1>Users</h1>
          <p className="subtitle">Everyone with a RecipeBox account.</p>
        </div>
      </div>

      {loading ? (
        <div className="state"><div className="spinner" /></div>
      ) : (
        <div className="card table-wrap">
          <table className="data" data-testid="users-table">
            <thead>
              <tr><th>Email</th><th>Role</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td><span className={`role-badge ${u.role === 'ADMIN' ? 'admin' : ''}`}>{u.role}</span></td>
                  <td>{new Date(u.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
