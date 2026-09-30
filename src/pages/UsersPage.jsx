import { useState } from 'react';
import { userService } from '../services/index.js';
import { useApi } from '../hooks/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Async } from '../components/States.jsx';
import { StatusBadge, Badge } from '../components/Badge.jsx';
import { Modal } from '../components/Modal.jsx';
import { TextInput, Select, Switch } from '../components/Field.jsx';
import { formatDateTime, titleCase } from '../utils/format.js';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'];
const PASSWORD_HINT = 'At least 10 characters with upper-case, lower-case and a number';

function UserModal({ user, freeRoles, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ name: user?.name || '', email: user?.email || '', username: user?.username || '', password: '', role: user?.role || freeRoles[0] });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    setBusy(true); setErrors({});
    try {
      if (user) await userService.update((user._id || user.id), { name: f.name, email: f.email, username: f.username });
      else await userService.create(f);
      toast.success('User saved'); onSaved();
    } catch (e) { setErrors(e.details || {}); toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={user ? 'Edit user' : 'New user'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy} onClick={save}>Save</button></>}>
      <div className="stack">
        <TextInput label="Name" value={f.name} onChange={set('name')} error={errors.name} />
        <div className="grid2"><TextInput label="Email" type="email" value={f.email} onChange={set('email')} error={errors.email} /><TextInput label="Username" value={f.username} onChange={set('username')} error={errors.username} /></div>
        {!user && <>
          <Select label="Role" value={f.role} onChange={set('role')} options={freeRoles.map((r) => ({ value: r, label: titleCase(r) }))} />
          <TextInput label="Password" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} hint={PASSWORD_HINT} error={errors.password} />
        </>}
      </div>
    </Modal>
  );
}

function ResetModal({ user, onClose }) {
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function save() {
    setBusy(true); setErr('');
    try { await userService.resetPassword((user._id || user.id), pw); toast.success('Password reset. All sessions for this user were signed out.'); onClose(); }
    catch (e) { setErr(e.details?.newPassword || e.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Reset password: ${user.name}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy || !pw} onClick={save}>Reset password</button></>}>
      <TextInput label="New password" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} hint={PASSWORD_HINT} error={err} />
    </Modal>
  );
}

export default function UsersPage() {
  const { user: me, can } = useAuth();
  const toast = useToast();
  const res = useApi(() => userService.list(), []);
  const [edit, setEdit] = useState(null);
  const [reset, setReset] = useState(null);
  const write = can('users:write');
  const reload = () => res.reload({ silent: true });

  async function act(fn, msg) { try { await fn(); toast.success(msg); reload(); } catch (e) { toast.error(e.message); reload(); } }
  const list = res.data || [];
  const freeRoles = ROLES.filter((r) => !list.some((u) => u.role === r));

  return (
    <>
      <PageHeader title="Users" subtitle="This installation has exactly three accounts. There is no public registration." actions={write && freeRoles.length ? <button className="btn primary" onClick={() => setEdit({})}>New user</button> : null} />
      <div className="card">
        <Async res={res}>{(d) => (
          <DataTable rows={d} columns={[
            { key: 'name', header: 'Name', render: (u) => <b>{u.name}{(u._id || u.id) === (me?.id || me?._id) ? ' (you)' : ''}</b> },
            { key: 'email', header: 'Email' },
            { key: 'username', header: 'Username' },
            { key: 'role', header: 'Role', render: (u) => <Badge plain>{titleCase(u.role)}</Badge> },
            { key: 'state', header: 'State', render: (u) => (u.lockUntil && new Date(u.lockUntil) > new Date() ? <StatusBadge status="blocked" label="Locked" /> : <StatusBadge status={u.isActive ? 'active' : 'inactive'} label={u.isActive ? 'Active' : 'Disabled'} />) },
            { key: 'lastLoginAt', header: 'Last login', render: (u) => <span className="muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</span> },
            { key: 'a', header: '', render: (u) => write ? (
              <span className="row" style={{ flexWrap: 'wrap' }}>
                <button className="btn sm" onClick={() => setEdit(u)}>Edit</button>
                <button className="btn sm" onClick={() => setReset(u)}>Reset password</button>
                {u.lockUntil && new Date(u.lockUntil) > new Date() ? <button className="btn sm" onClick={() => act(() => userService.unlock((u._id || u.id)), 'Account unlocked')}>Unlock</button> : null}
                <Switch label={`${u.isActive ? 'Disable' : 'Enable'} ${u.name}`} checked={u.isActive} disabled={(u._id || u.id) === (me?.id || me?._id)} onChange={(v) => act(() => userService.update((u._id || u.id), { isActive: v }), v ? 'User enabled' : 'User disabled')} />
              </span>) : null },
          ]} />)}
        </Async>
      </div>
      {edit && <UserModal user={(edit._id || edit.id) ? edit : null} freeRoles={freeRoles} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      {reset && <ResetModal user={reset} onClose={() => setReset(null)} />}
    </>
  );
}
