import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, TextInput } from '../components/Field.jsx';
import { Icon } from '../components/Icons.jsx';

export default function LoginPage() {
  const { user, login, ready } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (ready && user) return <Navigate to={loc.state?.from || '/'} replace />;

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(identifier, password);
      nav(loc.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.errorCode === 'ACCOUNT_LOCKED' ? err.message : err.status === 429 ? 'Too many attempts. Wait a few minutes and try again.' : err.message || 'Sign-in failed');
    } finally { setBusy(false); }
  }

  return (
    <div className="login-wrap">
      <div className="login-art">
        <div className="brand" style={{ padding: 0 }}>Operations Desk</div>
        <div>
          <h2>Every customer conversation, payment and email in one place.</h2>
          <p style={{ maxWidth: '44ch', color: '#9fb2c4' }}>WhatsApp, email, payments and alerts, connected to one customer record.</p>
        </div>
        <div className="small" style={{ color: '#7f92a5' }}>Access is by invitation from your super admin.</div>
      </div>
      <div className="login-form">
        <form onSubmit={submit} className="stack" noValidate>
          <div><h1 style={{ fontSize: 24 }}>Sign in</h1><p className="muted" style={{ margin: '4px 0 0' }}>Use your work email or username.</p></div>
          {error ? <div className="alert err" role="alert">{error}</div> : null}
          <TextInput label="Email or username" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoFocus />
          <Field label="Password">
            {(id) => (
              <div className="password-wrap">
                <input id={id} className="input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
            )}
          </Field>
          <button className="btn primary" disabled={busy || !identifier || !password} style={{ justifyContent: 'center' }}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
}
