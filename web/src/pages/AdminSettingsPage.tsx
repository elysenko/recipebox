import { useEffect, useState } from 'react';
import type { ServiceSetting } from '../lib/types';
import { getSettings, patchSettings } from '../lib/mockStore';

export default function AdminSettingsPage() {
  const [services, setServices] = useState<ServiceSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savedFor, setSavedFor] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    getSettings().then((s) => { setServices(s); setLoading(false); });
  }
  useEffect(() => { reload(); }, []);

  async function save(service: ServiceSetting) {
    const values: Record<string, string> = {};
    for (const f of service.fields) {
      const v = drafts[f.key];
      if (v != null && v.trim()) values[f.key] = v;
    }
    await patchSettings(values);
    setDrafts((prev) => {
      const next = { ...prev };
      service.fields.forEach((f) => delete next[f.key]);
      return next;
    });
    setSavedFor(service.service);
    reload();
    setTimeout(() => setSavedFor(null), 2500);
  }

  return (
    <div data-testid="admin-settings-page">
      <div className="page-head">
        <div className="grow">
          <h1>Service settings</h1>
          <p className="subtitle">Configure backing-service credentials. Values are stored securely and shown masked.</p>
        </div>
      </div>

      {loading ? (
        <div className="state"><div className="spinner" /></div>
      ) : (
        services.map((svc) => (
          <div className="card service-card" key={svc.service} data-testid={`service-${svc.service}`}>
            <div className="service-head">
              <h2 style={{ margin: 0 }}>{svc.label}</h2>
              <span className={`badge ${svc.configured ? 'ok' : 'missing'}`} data-testid={`status-${svc.service}`}>
                {svc.configured ? 'Configured' : 'Not configured'}
              </span>
              {savedFor === svc.service && <span className="helper">Saved ✓</span>}
            </div>

            {svc.fields.map((f) => (
              <div className="field" key={f.key}>
                <label htmlFor={f.key}>{f.label}{f.secret ? ' 🔒' : ''}</label>
                <input
                  id={f.key}
                  type={f.secret ? 'password' : 'text'}
                  placeholder={f.configured ? `Current: ${f.value}` : 'Not set'}
                  value={drafts[f.key] ?? ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}

            <div className="chips" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={() => save(svc)} data-testid={`save-${svc.service}`}>
                Save {svc.label}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
