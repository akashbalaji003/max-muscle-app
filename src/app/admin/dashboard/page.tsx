'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Shield, Calendar, Plus, LogOut, CheckCircle, XCircle,
  Clock, QrCode, RefreshCw, Home, Trash2, Ban, UserCheck, RotateCcw, BarChart2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Link from 'next/link';
import { formatDate, daysRemaining, isMembershipActive } from '@/lib/utils';

interface Membership {
  id: string;
  start_date: string;
  end_date: string;
  joined_on: string | null;
  last_renewed_on: string | null;
  active: boolean;
}

interface UserRow {
  id: string;
  phone_number: string;
  name: string | null;
  created_at: string;
  banned: boolean;
  memberships: Membership[];
}

interface AttendanceRow {
  id: string;
  date: string;
  checked_in_at: string;
  users: { phone_number: string; name: string | null };
}

const DURATIONS = [1, 2, 3, 6, 12];

/** Deterministic 4-digit member ID from UUID (1000–9999) */
function memberId(uuid: string): string {
  const hex = uuid.replace(/-/g, '').slice(0, 4);
  return ((parseInt(hex, 16) % 9000) + 1000).toString();
}

export default function AdminDashboardPage() {
  const router = useRouter();

  // Data
  const [users, setUsers] = useState<UserRow[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRow[]>([]);

  // UI state
  const [tab, setTab] = useState<'users' | 'attendance' | 'add' | 'renew'>('users');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Action loading states
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [banningId, setBanningId] = useState<string | null>(null);

  // Add membership form
  const [addForm, setAddForm] = useState({ phone_number: '', duration_months: '1' });
  const [addMsg, setAddMsg] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Renew membership form
  const [renewForm, setRenewForm] = useState({ phone_number: '', duration_months: '1' });
  const [renewMsg, setRenewMsg] = useState('');
  const [renewError, setRenewError] = useState('');
  const [renewLoading, setRenewLoading] = useState(false);

  async function loadAttendance(date: string) {
    const aRes = await fetch(`/api/admin/attendance?date=${date}`);
    if (aRes.ok) {
      const ad = await aRes.json();
      setTodayAttendance(ad.attendance || []);
    }
  }

  async function loadAll() {
    setRefreshing(true);
    const [uRes, aRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch(`/api/admin/attendance?date=${attendanceDate}`),
    ]);

    if (uRes.status === 401 || uRes.status === 403) { router.push('/admin/login'); return; }

    const ud = await uRes.json();
    setUsers(ud.users || []);

    if (aRes.ok) {
      const ad = await aRes.json();
      setTodayAttendance(ad.attendance || []);
    }
    setRefreshing(false);
  }

  useEffect(() => { loadAll(); }, []);

  // ── Add Membership ──────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddMsg(''); setAddError(''); setAddLoading(true);

    const res = await fetch('/api/admin/membership', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number: addForm.phone_number,
        duration_months: parseInt(addForm.duration_months),
        action: 'add',
      }),
    });

    const data = await res.json();
    setAddLoading(false);

    if (!res.ok) { setAddError(data.error); return; }

    setAddMsg(data.message);
    setAddForm({ phone_number: '', duration_months: '1' });
    await loadAll();
    setTab('users');
  }

  // ── Renew Membership ────────────────────────────────────────────────────
  async function handleRenew(e: React.FormEvent) {
    e.preventDefault();
    setRenewMsg(''); setRenewError(''); setRenewLoading(true);

    const res = await fetch('/api/admin/membership', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number: renewForm.phone_number,
        duration_months: parseInt(renewForm.duration_months),
        action: 'renew',
      }),
    });

    const data = await res.json();
    setRenewLoading(false);

    if (!res.ok) { setRenewError(data.error); return; }

    setRenewMsg(data.message);
    setRenewForm({ phone_number: '', duration_months: '1' });
    await loadAll();
    setTab('users');
  }

  // ── Cancel membership ───────────────────────────────────────────────────
  async function handleCancelMembership(userId: string, userName: string) {
    if (!confirm(`Cancel membership for ${userName}? They will lose access immediately.`)) return;
    setCancellingId(userId);
    const res = await fetch(`/api/admin/membership?user_id=${userId}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Failed'); }
    else await loadAll();
    setCancellingId(null);
  }

  // ── Delete member ───────────────────────────────────────────────────────
  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`Permanently DELETE ${userName}? All their data will be removed and cannot be undone.`)) return;
    setDeletingId(userId);
    const res = await fetch(`/api/admin/users?user_id=${userId}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Failed'); }
    else await loadAll();
    setDeletingId(null);
  }

  // ── Ban / Unban ─────────────────────────────────────────────────────────
  async function handleToggleBan(userId: string, userName: string, banned: boolean) {
    if (!confirm(`${banned ? 'Unban' : 'Ban'} ${userName}?`)) return;
    setBanningId(userId);
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, banned: !banned }),
    });
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Failed'); }
    else await loadAll();
    setBanningId(null);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/maxmuscle');
  }

  // ── Derived stats ───────────────────────────────────────────────────────
  const activeMembers = users.filter((u) => {
    const mem = u.memberships?.[0];
    return mem && isMembershipActive(mem.end_date);
  }).length;

  const expiredMembers = users.filter((u) => {
    const mem = u.memberships?.[0];
    return mem && !isMembershipActive(mem.end_date);
  }).length;

  const filteredUsers = users.filter((u) =>
    search === '' ||
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    u.phone_number.includes(search)
  );

  const STATS = [
    { label: 'Total Members', value: users.length, icon: Users, color: 'violet' as const },
    { label: 'Active', value: activeMembers, icon: CheckCircle, color: 'violet' as const },
    { label: 'Expired', value: expiredMembers, icon: XCircle, color: 'violet' as const },
    { label: "Today's Check-ins", value: todayAttendance.length, icon: Clock, color: 'violet' as const },
  ];

  const TABS = [
    { key: 'users', label: 'Members' },
    { key: 'attendance', label: "Today's Attendance" },
    { key: 'add', label: '+ Add Membership' },
    { key: 'renew', label: '↻ Renew Membership' },
  ] as const;

  return (
    <div className="admin-shell relative min-h-screen overflow-x-hidden bg-[#000000] px-4 py-4 pb-24 text-white md:px-6 lg:px-8 lg:pb-8">
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes count-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.15); }
          50% { box-shadow: 0 0 40px rgba(124,58,237,0.35); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-violet-600/6 blur-[120px] sm:h-[420px] sm:w-[420px] sm:blur-[160px]" />
        <div className="absolute bottom-0 right-0 h-[220px] w-[220px] rounded-full bg-indigo-700/5 blur-[120px] sm:h-[360px] sm:w-[360px] sm:blur-[150px]" />
        <div className="absolute left-[-80px] top-1/2 h-[200px] w-[200px] rounded-full bg-purple-800/4 blur-[120px] sm:h-[320px] sm:w-[320px] sm:blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/6 bg-[#0a0a0a] p-4 shadow-[0_0_40px_rgba(124,58,237,0.08)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10"
              style={{ animation: 'glow-pulse 3s ease-in-out infinite' }}
            >
              <Shield className="h-5 w-5 text-violet-400" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl tracking-wide text-white leading-tight">Admin Dashboard</h1>
              <p className="text-xs uppercase tracking-widest text-slate-500">Max Muscle Lifestyle Fitness Studio</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition-all duration-200 hover:border-violet-500/20 hover:bg-violet-500/8">
              <Home className="h-3.5 w-3.5 text-violet-400" />
              <span className="hidden sm:inline">Member Site</span>
            </Link>
            <Link href="/admin/qr" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-300 transition-all duration-200 hover:bg-violet-500/15">
              <QrCode className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">QR Code</span>
            </Link>
            <button onClick={loadAll} disabled={refreshing} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/8 bg-white/5 p-2 text-slate-400 transition-all duration-200 hover:border-violet-500/20 hover:text-white">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleLogout} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-400/20 bg-transparent px-3 py-2 text-xs text-red-400 transition-all duration-200 hover:bg-red-500/8 hover:text-red-300">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stagger mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map(({ label, value, icon: Icon, color }, index) => (
            <Card
              key={label}
              className="group flex items-center gap-3 rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-500/20 hover:shadow-[0_0_30px_rgba(124,58,237,0.10)]"
              style={{ animation: 'fade-up 300ms ease-out both', animationDelay: `${index * 80}ms` }}
            >
              <div className={`rounded-xl p-2.5 flex-shrink-0 bg-${color}-500/10 text-violet-400 transition-transform duration-200 group-hover:scale-110`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-slate-500">{label}</p>
                <p className="font-display text-3xl font-black text-white tabular-nums" style={{ animation: 'count-in 400ms ease both', animationDelay: `${index * 80 + 80}ms` }}>{value}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-white/6 bg-[#0a0a0a] p-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex min-h-[44px] flex-shrink-0 items-center whitespace-nowrap rounded-xl px-4 py-2 text-xs font-medium transition-all duration-200 sm:text-sm ${
                tab === key ? 'bg-violet-600 text-white shadow-[0_0_24px_rgba(124,58,237,0.18)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Members ── */}
        {tab === 'users' && (
          <>
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full max-w-sm rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white placeholder:text-slate-600 transition-all duration-200 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
              />
            </div>

            <Card className="overflow-hidden rounded-2xl border border-white/6 bg-[#0a0a0a] p-0">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/5 bg-[#050505]">
                    <tr>
                      {['ID', 'Name', 'Phone', 'Status', 'Days Left', 'Joined', 'Renewed', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => {
                      const mem = u.memberships?.[0];
                      const active = mem ? isMembershipActive(mem.end_date) : false;
                      const days = mem ? daysRemaining(mem.end_date) : null;
                      const joinedDate = mem ? (mem.joined_on || mem.start_date) : null;
                      const renewedDate = mem?.last_renewed_on || null;
                      const busy = deletingId === u.id || banningId === u.id || cancellingId === u.id;

                      return (
                        <tr key={u.id} className={`transition-colors duration-150 hover:bg-violet-500/5 ${u.banned ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs">{memberId(u.id)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-white">
                            <div className="flex items-center gap-2 flex-wrap">
                              {u.name || '—'}
                              {u.banned && (
                                <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">Banned</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs">{u.phone_number}</td>
                          <td className="px-4 py-3">
                            {mem
                              ? <Badge variant={active ? 'success' : 'danger'} className={active ? 'border-violet-500/20 bg-violet-500/10 text-violet-400' : 'border-red-500/20 bg-red-500/10 text-red-400'}>{active ? 'Active' : 'Expired'}</Badge>
                              : <Badge variant="default" className="border-white/10 bg-white/5 text-slate-400">No Plan</Badge>}
                          </td>
                          <td className="px-4 py-3">
                            {days !== null
                              ? <span className="font-semibold text-violet-400">{days}d</span>
                              : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{joinedDate ? formatDate(joinedDate) : '—'}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{renewedDate ? formatDate(renewedDate) : <span className="text-slate-600">—</span>}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {mem && (
                                <button onClick={() => handleCancelMembership(u.id, u.name || u.phone_number)} disabled={busy}
                                  title="Cancel membership"
                                  className="flex items-center gap-1 text-xs text-slate-500 transition-colors disabled:opacity-50 hover:text-violet-400">
                                  {cancellingId === u.id
                                    ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                                    : <XCircle className="w-3.5 h-3.5" />}
                                  Cancel
                                </button>
                              )}
                              <button onClick={() => handleToggleBan(u.id, u.name || u.phone_number, u.banned)} disabled={busy}
                                title={u.banned ? 'Unban' : 'Ban'}
                                className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${u.banned ? 'text-violet-400 hover:text-violet-300' : 'text-slate-500 hover:text-violet-400'}`}>
                                {banningId === u.id
                                  ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                                  : u.banned ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                {u.banned ? 'Unban' : 'Ban'}
                              </button>
                              <button onClick={() => handleDelete(u.id, u.name || u.phone_number)} disabled={busy}
                                title="Delete member"
                                className="flex items-center gap-1 text-xs text-slate-500 transition-colors disabled:opacity-50 hover:text-red-400">
                                {deletingId === u.id
                                  ? <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                  : <Trash2 className="w-3.5 h-3.5" />}
                                Delete
                              </button>
                              <Link href={`/admin/members/${u.id}`}
                                className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-violet-400">
                                <BarChart2 className="w-3.5 h-3.5" />
                                Analytics
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No members found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-white/5">
                {filteredUsers.map((u) => {
                  const mem = u.memberships?.[0];
                  const active = mem ? isMembershipActive(mem.end_date) : false;
                  const days = mem ? daysRemaining(mem.end_date) : null;
                  const joinedDate = mem ? (mem.joined_on || mem.start_date) : null;
                  const renewedDate = mem?.last_renewed_on || null;
                  const busy = deletingId === u.id || banningId === u.id || cancellingId === u.id;

                  return (
                    <div key={u.id} className={`border-t border-white/5 p-4 transition-colors duration-150 hover:bg-violet-500/5 ${u.banned ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">#{memberId(u.id)}</span>
                            <p className="font-medium text-white text-sm">{u.name || '—'}</p>
                            {u.banned && <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-400">Banned</span>}
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{u.phone_number}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {mem
                            ? <Badge variant={active ? 'success' : 'danger'} className={active ? 'border-violet-500/20 bg-violet-500/10 text-violet-400' : 'border-red-500/20 bg-red-500/10 text-red-400'}>{active ? 'Active' : 'Expired'}</Badge>
                            : <Badge variant="default" className="border-white/10 bg-white/5 text-slate-400">No Plan</Badge>}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                        <div className="flex flex-col items-center justify-center text-center">
                          <p className="text-slate-600 mb-0.5">Days Left</p>
                          <p className="font-semibold text-violet-400">
                            {days !== null ? `${days}d` : '—'}
                          </p>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center">
                          <p className="text-slate-600 mb-0.5">Joined</p>
                          <p className="text-slate-400">{joinedDate ? formatDate(joinedDate) : '—'}</p>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center">
                          <p className="text-slate-600 mb-0.5">Renewed</p>
                          <p className="text-slate-400">{renewedDate ? formatDate(renewedDate) : '—'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {mem && (
                          <button onClick={() => handleCancelMembership(u.id, u.name || u.phone_number)} disabled={busy}
                            className="flex items-center gap-1 text-xs text-slate-500 transition-colors disabled:opacity-50 hover:text-violet-400">
                            {cancellingId === u.id ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" /> : <XCircle className="w-3 h-3" />}
                            Cancel
                          </button>
                        )}
                        <button onClick={() => handleToggleBan(u.id, u.name || u.phone_number, u.banned)} disabled={busy}
                          className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${u.banned ? 'text-violet-400 hover:text-violet-300' : 'text-slate-500 hover:text-violet-400'}`}>
                          {banningId === u.id ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" /> : u.banned ? <UserCheck className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                          {u.banned ? 'Unban' : 'Ban'}
                        </button>
                        <button onClick={() => handleDelete(u.id, u.name || u.phone_number)} disabled={busy}
                          className="flex items-center gap-1 text-xs text-slate-500 transition-colors disabled:opacity-50 hover:text-red-400">
                          {deletingId === u.id ? <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Delete
                        </button>
                        <Link href={`/admin/members/${u.id}`}
                          className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-violet-400">
                          <BarChart2 className="w-3 h-3" />
                          Analytics
                        </Link>
                      </div>
                    </div>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <p className="px-4 py-10 text-center text-slate-500">No members found</p>
                )}
              </div>
            </Card>
          </>
        )}

        {/* ── Attendance ── */}
        {tab === 'attendance' && (
          <Card className="overflow-hidden rounded-2xl border border-white/6 bg-[#0a0a0a] p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Calendar className="h-4 w-4 text-violet-400" />
                {new Date(attendanceDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h2>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={attendanceDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const d = e.target.value;
                    setAttendanceDate(d);
                    loadAttendance(d);
                  }}
                  className="rounded-xl border border-white/10 bg-[#111111] px-3 py-2 text-xs text-slate-300 transition-all duration-200 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
                />
                <Badge variant="info" className="border-violet-500/20 bg-violet-500/10 text-violet-400">{todayAttendance.length} check-ins</Badge>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {todayAttendance.map((a, i) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 font-mono w-5 text-right">{i + 1}.</span>
                    <div>
                      <p className="font-medium text-white text-sm">{a.users?.name || a.users?.phone_number}</p>
                      {a.users?.name && <p className="text-xs text-slate-500">{a.users.phone_number}</p>}
                    </div>
                  </div>
                  <span className="text-sm text-slate-400 font-mono">
                    {new Date(a.checked_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {todayAttendance.length === 0 && (
                <p className="px-4 py-10 text-center text-slate-500">No check-ins for this date</p>
              )}
            </div>
          </Card>
        )}

        {/* ── Add Membership ── */}
        {tab === 'add' && (
          <div className="max-w-md">
            <Card className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 shadow-[0_0_40px_rgba(124,58,237,0.08)] sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <Plus className="h-4 w-4 text-violet-400" />
                <h2 className="font-display tracking-wide text-white">Add New Membership</h2>
              </div>
              <p className="mb-5 text-xs text-slate-500">
                Use this for members who have <span className="text-slate-300 font-medium">no existing membership</span>. Creates a fresh plan starting today.
              </p>

              {addMsg && (
                <div className="mb-4 rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-sm text-violet-400">{addMsg}</div>
              )}
              {addError && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{addError}</div>
              )}

              <form onSubmit={handleAdd} className="space-y-4">
                <Input
                  label="Member Phone Number"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={addForm.phone_number}
                  onChange={(e) => setAddForm((f) => ({ ...f, phone_number: e.target.value }))}
                  required
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Duration</label>
                  <select
                    value={addForm.duration_months}
                    onChange={(e) => setAddForm((f) => ({ ...f, duration_months: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-slate-100 transition-all duration-200 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
                  >
                    {DURATIONS.map((m) => (
                      <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-white transition-all duration-200 hover:bg-violet-500 disabled:opacity-50"
                >
                  {addLoading && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                  <Plus className="w-4 h-4" /> Add Membership
                </button>
              </form>
            </Card>
          </div>
        )}

        {/* ── Renew Membership ── */}
        {tab === 'renew' && (
          <div className="max-w-md">
            <Card className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 shadow-[0_0_40px_rgba(124,58,237,0.08)] sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <RotateCcw className="h-4 w-4 text-violet-400" />
                <h2 className="font-display tracking-wide text-white">Renew Membership</h2>
              </div>
              <p className="mb-5 text-xs text-slate-500">
                Use this for members who <span className="text-slate-300 font-medium">already have a membership</span> (active or expired). Extends from the current end date if still active, or from today if expired.
              </p>

              {renewMsg && (
                <div className="mb-4 rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-sm text-violet-400">{renewMsg}</div>
              )}
              {renewError && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{renewError}</div>
              )}

              <form onSubmit={handleRenew} className="space-y-4">
                <Input
                  label="Member Phone Number"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={renewForm.phone_number}
                  onChange={(e) => setRenewForm((f) => ({ ...f, phone_number: e.target.value }))}
                  required
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Extra Duration</label>
                  <select
                    value={renewForm.duration_months}
                    onChange={(e) => setRenewForm((f) => ({ ...f, duration_months: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-slate-100 transition-all duration-200 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
                  >
                    {DURATIONS.map((m) => (
                      <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={renewLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-white transition-all duration-200 hover:bg-violet-500 disabled:opacity-50"
                >
                  {renewLoading && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                  <RotateCcw className="w-4 h-4" /> Renew Membership
                </button>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
