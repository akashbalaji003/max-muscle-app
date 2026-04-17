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

  useEffect(() => { loadAll(); }, []);

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
    router.push('/');
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
    { label: 'Total Members', value: users.length, icon: Users, color: 'red' as const },
    { label: 'Active', value: activeMembers, icon: CheckCircle, color: 'emerald' as const },
    { label: 'Expired', value: expiredMembers, icon: XCircle, color: 'rose' as const },
    { label: "Today's Check-ins", value: todayAttendance.length, icon: Clock, color: 'amber' as const },
  ];

  const TABS = [
    { key: 'users', label: 'Members' },
    { key: 'attendance', label: "Today's Attendance" },
    { key: 'add', label: '+ Add Membership' },
    { key: 'renew', label: '↻ Renew Membership' },
  ] as const;

  return (
    <div className="admin-shell min-h-screen bg-[#000000] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">Admin Dashboard</h1>
              <p className="text-xs text-slate-400">Max Muscle Lifestyle Fitness Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Link href="/dashboard" className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-700/40 text-slate-300 border border-slate-600/40 rounded-xl text-xs font-medium hover:bg-slate-700/60 transition-all">
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Member Site</span>
            </Link>
            <Link href="/admin/qr" className="flex items-center gap-1.5 px-2.5 py-2 bg-red-700/20 text-red-300 border border-red-600/30 rounded-xl text-xs font-medium hover:bg-red-700/30 transition-all">
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">QR Code</span>
            </Link>
            <button onClick={loadAll} disabled={refreshing} className="p-2 text-slate-400 hover:text-white transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 stagger">
          {STATS.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="flex items-center gap-3 p-4 fade-in">
              <div className={`p-2.5 rounded-xl flex-shrink-0 bg-${color}-500/10 text-${color}-400 transition-transform group-hover:scale-110`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">{label}</p>
                <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#0f0f0f] rounded-xl p-1 mb-5 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-shrink-0 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                tab === key ? 'bg-red-700 text-white' : 'text-slate-400 hover:text-white'
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
                className="w-full max-w-sm bg-[#0f0f0f] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-600"
              />
            </div>

            <Card className="overflow-hidden p-0">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/5">
                    <tr>
                      {['ID', 'Name', 'Phone', 'Status', 'Days Left', 'Joined', 'Renewed', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
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
                        <tr key={u.id} className={`hover:bg-red-600/4 transition-all duration-150 ${u.banned ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs">{memberId(u.id)}</td>
                          <td className="px-4 py-3 font-medium text-white">
                            <div className="flex items-center gap-2 flex-wrap">
                              {u.name || '—'}
                              {u.banned && (
                                <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-medium">Banned</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs">{u.phone_number}</td>
                          <td className="px-4 py-3">
                            {mem
                              ? <Badge variant={active ? 'success' : 'danger'}>{active ? 'Active' : 'Expired'}</Badge>
                              : <Badge variant="default">No Plan</Badge>}
                          </td>
                          <td className="px-4 py-3">
                            {days !== null
                              ? <span className={`font-semibold ${days === 0 ? 'text-red-400' : days <= 7 ? 'text-amber-400' : 'text-emerald-400'}`}>{days}d</span>
                              : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{joinedDate ? formatDate(joinedDate) : '—'}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{renewedDate ? formatDate(renewedDate) : <span className="text-slate-600">—</span>}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {mem && (
                                <button onClick={() => handleCancelMembership(u.id, u.name || u.phone_number)} disabled={busy}
                                  title="Cancel membership"
                                  className="text-xs text-slate-500 hover:text-orange-400 transition-colors disabled:opacity-50 flex items-center gap-1">
                                  {cancellingId === u.id
                                    ? <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                                    : <XCircle className="w-3.5 h-3.5" />}
                                  Cancel
                                </button>
                              )}
                              <button onClick={() => handleToggleBan(u.id, u.name || u.phone_number, u.banned)} disabled={busy}
                                title={u.banned ? 'Unban' : 'Ban'}
                                className={`text-xs transition-colors disabled:opacity-50 flex items-center gap-1 ${u.banned ? 'text-emerald-500 hover:text-emerald-400' : 'text-slate-500 hover:text-amber-400'}`}>
                                {banningId === u.id
                                  ? <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                  : u.banned ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                {u.banned ? 'Unban' : 'Ban'}
                              </button>
                              <button onClick={() => handleDelete(u.id, u.name || u.phone_number)} disabled={busy}
                                title="Delete member"
                                className="text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50 flex items-center gap-1">
                                {deletingId === u.id
                                  ? <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                  : <Trash2 className="w-3.5 h-3.5" />}
                                Delete
                              </button>
                              <Link href={`/admin/members/${u.id}`}
                                className="text-xs text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-1">
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
                    <div key={u.id} className={`p-4 hover:bg-red-600/4 transition-all duration-150 ${u.banned ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-slate-600 font-mono bg-white/5 px-1.5 py-0.5 rounded">#{memberId(u.id)}</span>
                            <p className="font-medium text-white text-sm">{u.name || '—'}</p>
                            {u.banned && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full">Banned</span>}
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{u.phone_number}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {mem
                            ? <Badge variant={active ? 'success' : 'danger'}>{active ? 'Active' : 'Expired'}</Badge>
                            : <Badge variant="default">No Plan</Badge>}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                        <div className="flex flex-col items-center justify-center text-center">
                          <p className="text-slate-600 mb-0.5">Days Left</p>
                          <p className={`font-semibold ${days === null ? 'text-slate-600' : days === 0 ? 'text-red-400' : days <= 7 ? 'text-amber-400' : 'text-emerald-400'}`}>
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
                            className="text-xs text-slate-600 hover:text-orange-400 transition-colors disabled:opacity-50 flex items-center gap-1">
                            {cancellingId === u.id ? <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" /> : <XCircle className="w-3 h-3" />}
                            Cancel
                          </button>
                        )}
                        <button onClick={() => handleToggleBan(u.id, u.name || u.phone_number, u.banned)} disabled={busy}
                          className={`text-xs transition-colors disabled:opacity-50 flex items-center gap-1 ${u.banned ? 'text-emerald-500 hover:text-emerald-400' : 'text-slate-600 hover:text-amber-400'}`}>
                          {banningId === u.id ? <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> : u.banned ? <UserCheck className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                          {u.banned ? 'Unban' : 'Ban'}
                        </button>
                        <button onClick={() => handleDelete(u.id, u.name || u.phone_number)} disabled={busy}
                          className="text-xs text-slate-600 hover:text-red-400 transition-colors disabled:opacity-50 flex items-center gap-1">
                          {deletingId === u.id ? <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Delete
                        </button>
                        <Link href={`/admin/members/${u.id}`}
                          className="text-xs text-slate-600 hover:text-blue-400 transition-colors flex items-center gap-1">
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
          <Card className="overflow-hidden p-0">
            <div className="px-4 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-white flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-amber-400" />
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
                  className="bg-[#0f0f0f] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-red-600"
                />
                <Badge variant="info">{todayAttendance.length} check-ins</Badge>
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
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <Plus className="w-4 h-4 text-emerald-400" />
                <h2 className="font-semibold text-white">Add New Membership</h2>
              </div>
              <p className="text-xs text-slate-500 mb-5">
                Use this for members who have <span className="text-slate-300 font-medium">no existing membership</span>. Creates a fresh plan starting today.
              </p>

              {addMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-400 mb-4">{addMsg}</div>
              )}
              {addError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400 mb-4">{addError}</div>
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
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Duration</label>
                  <select
                    value={addForm.duration_months}
                    onChange={(e) => setAddForm((f) => ({ ...f, duration_months: e.target.value }))}
                    className="w-full bg-[#000000] border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    {DURATIONS.map((m) => (
                      <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <h2 className="font-semibold text-white">Renew Membership</h2>
              </div>
              <p className="text-xs text-slate-500 mb-5">
                Use this for members who <span className="text-slate-300 font-medium">already have a membership</span> (active or expired). Extends from the current end date if still active, or from today if expired.
              </p>

              {renewMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-400 mb-4">{renewMsg}</div>
              )}
              {renewError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400 mb-4">{renewError}</div>
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
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Extra Duration</label>
                  <select
                    value={renewForm.duration_months}
                    onChange={(e) => setRenewForm((f) => ({ ...f, duration_months: e.target.value }))}
                    className="w-full bg-[#000000] border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-red-600"
                  >
                    {DURATIONS.map((m) => (
                      <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={renewLoading}
                  className="w-full h-12 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
