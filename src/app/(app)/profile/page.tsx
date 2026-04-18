'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Scale, Ruler, Target, Edit3, Check, X, ChevronRight,
  TrendingUp, AlertTriangle, Award, Activity, Camera, Lock,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Goal = 'fat_loss' | 'muscle_gain' | 'maintenance';

interface ProfileData {
  id: string;
  name: string | null;
  phone_number: string;
  height_cm: number | null;
  weight_kg: number | null;
  goal: Goal | null;
  bmi: number | null;
  bmiCategory: string | null;
  created_at: string;
  is_private: boolean;
}

// ── BMI helpers ───────────────────────────────────────────────────────────────
const BMI_SEGMENTS = [
  { label: 'Underweight', range: '<18.5', color: '#a78bfa', max: 18.5 },
  { label: 'Normal', range: '18.5–24.9', color: '#8b5cf6', max: 25 },
  { label: 'Overweight', range: '25–29.9', color: '#7c3aed', max: 30 },
  { label: 'Obese', range: '≥30', color: '#6d28d9', max: 40 },
];

function getBMIColor(bmi: number): string {
  if (bmi < 18.5) return '#a78bfa';
  if (bmi < 25) return '#8b5cf6';
  if (bmi < 30) return '#7c3aed';
  return '#6d28d9';
}

/** Map BMI (10–45) to 0–100% for the gauge needle */
function bmiToPercent(bmi: number): number {
  const clamped = Math.max(10, Math.min(45, bmi));
  return ((clamped - 10) / 35) * 100;
}

// ── Goal config ───────────────────────────────────────────────────────────────
const GOAL_OPTIONS: { value: Goal; label: string; icon: string; description: string }[] = [
  { value: 'fat_loss', label: 'Fat Loss', icon: '🔥', description: 'Reduce body fat, improve cardio' },
  { value: 'muscle_gain', label: 'Muscle Gain', icon: '💪', description: 'Build strength & size' },
  { value: 'maintenance', label: 'Maintenance', icon: '⚖️', description: 'Stay fit & balanced' },
];

// ── BMI Gauge component ───────────────────────────────────────────────────────
function BMIGauge({ bmi, category }: { bmi: number; category: string }) {
  const color = getBMIColor(bmi);
  const pct = bmiToPercent(bmi);

  return (
    <div className="space-y-3">
      {/* Needle bar */}
      <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #60a5fa 0%, #34d399 30%, #fbbf24 60%, #f87171 100%)' }}>
        {/* needle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-5 rounded-full border-2 border-[#0f0f0f] shadow-lg transition-all duration-700"
          style={{ left: `calc(${pct}% - 4px)`, background: color }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
        {BMI_SEGMENTS.map(s => (
          <span key={s.label} style={{ color: bmiCategory(bmi) === s.label ? s.color : undefined }}>{s.label}</span>
        ))}
      </div>

      {/* Value pill */}
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold" style={{ color }}>{bmi}</span>
        <div>
          <div className="text-sm font-semibold" style={{ color }}>{category}</div>
          <div className="text-xs text-slate-500">Body Mass Index</div>
        </div>
      </div>
    </div>
  );
}

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

// ── Editable field component ──────────────────────────────────────────────────
function EditableField({
  label, value, unit, type = 'text', min, max, step, onSave, icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  onSave: (v: string) => Promise<void>;
  icon: React.ElementType;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function save() {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type={type}
              value={draft}
              min={min}
              max={max}
              step={step}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
              className="flex-1 min-w-0 rounded-lg border border-violet-500/20 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
            />
            {unit && <span className="text-xs text-slate-500 flex-shrink-0">{unit}</span>}
            <button onClick={save} disabled={saving} className="flex-shrink-0 rounded-lg bg-violet-500/10 p-1.5 text-violet-400 hover:bg-violet-500/20">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={cancel} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-sm text-white font-medium">
            {value || <span className="text-slate-500 italic">Not set</span>}
            {value && unit && <span className="text-slate-400 ml-1 text-xs">{unit}</span>}
          </div>
        )}
      </div>
      {!editing && (
        <button onClick={startEdit} className="p-2 text-slate-500 hover:text-white transition-colors flex-shrink-0">
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData & { avatar_url?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [followStats, setFollowStats] = useState({ followers_count: 0, following_count: 0 });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(1);

  useEffect(() => {
    Promise.all([
      fetch('/api/profile'),
      fetch('/api/follow'),
    ]).then(async ([profileRes, followRes]) => {
      if (profileRes.status === 401) { router.push('/login'); return; }
      if (profileRes.ok) setProfile(await profileRes.json());
      if (followRes.ok) {
        const fd = await followRes.json();
        setFollowStats({ followers_count: fd.followers_count ?? 0, following_count: fd.following_count ?? 0 });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload/avatar', { method: 'POST', body: fd });
    if (res.ok) {
      const { avatar_url } = await res.json();
      setProfile((p) => p ? { ...p, avatar_url } : p);
      setAvatarVersion((v) => v + 1); // bust proxy cache only after real upload
      showToast('Profile picture updated!');
    } else {
      const d = await res.json().catch(() => ({}));
      showToast(d.error || 'Upload failed', false);
    }
    setUploadingAvatar(false);
    if (avatarFileRef.current) avatarFileRef.current.value = '';
  }

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  }

  async function patchProfile(patch: Record<string, string | number | boolean | null>) {
    setSaving(true);
    const r = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (r.ok) {
      const updated = await fetch('/api/profile').then(x => x.json());
      setProfile(updated);
      showToast('Profile updated');
    } else {
      const err = await r.json().catch(() => ({}));
      showToast(err.error || 'Update failed', false);
    }
    setSaving(false);
  }

  async function saveField(field: string, raw: string) {
    const numFields = ['height_cm', 'weight_kg'];
    const val = numFields.includes(field) ? Number(raw) : raw;
    await patchProfile({ [field]: val });
  }

  async function saveGoal(goal: Goal) {
    await patchProfile({ goal });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const initials = profile.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile.phone_number.slice(-2);

  const bmiTip = profile.bmi
    ? profile.bmi >= 30
      ? 'Focus on full-body cardio circuits to improve cardiovascular health and reduce body fat.'
      : profile.bmi >= 25
      ? 'Combine strength training with moderate cardio to improve body composition.'
      : profile.bmi >= 18.5
      ? 'Your BMI is healthy. Continue structured training aligned with your goal.'
      : 'Prioritise heavy compound lifts and a caloric surplus to build muscle mass.'
    : null;

  return (
    <div className="relative min-h-screen overflow-hidden pb-24 lg:pb-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-xl transition-all ${
          toast.ok ? 'border border-violet-500/30 bg-violet-500/10 text-violet-300' : 'border border-violet-500/20 bg-violet-500/10 text-violet-300'
        }`}>
          {toast.ok ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="mx-auto max-w-2xl space-y-5 px-4 pt-6">

        {/* Header Card */}
        <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5">
          <div className="flex items-start gap-4">
            {/* Avatar with upload button */}
            <div className="relative flex-shrink-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/image/avatar?v=${avatarVersion}`}
                  alt="Profile"
                  className="h-16 w-16 rounded-2xl object-cover ring-2 ring-violet-500/20"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-xl font-bold text-white shadow-lg shadow-violet-900/40">
                  {initials}
                </div>
              )}
              {/* Upload overlay */}
              <button
                onClick={() => avatarFileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0f0f0f] bg-violet-600 shadow-lg transition-transform active:scale-90"
                title="Change photo"
              >
                {uploadingAvatar
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="w-2.5 h-2.5 text-white" />}
              </button>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white leading-tight truncate">
                {profile.name || 'Anonymous Member'}
              </h1>
              <p className="text-sm text-slate-400">{profile.phone_number}</p>
              {memberSince && (
                <p className="text-xs text-slate-600 mt-0.5">Member since {memberSince}</p>
              )}
            </div>
            <div className="flex-shrink-0">
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-400">
                Active
              </div>
            </div>
          </div>

          {/* Follow stats row */}
          <div className="flex gap-5 mt-4 pt-4 border-t border-white/5">
            <div className="text-center">
              <p className="text-lg font-bold text-white leading-none">{followStats.followers_count}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white leading-none">{followStats.following_count}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Following</p>
            </div>
            <div className="ml-auto">
            <button
                onClick={() => router.push('/progress')}
                className="flex items-center gap-1 text-xs font-medium text-violet-400 transition-colors hover:text-violet-300"
              >
                View Social Feed <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* BMI Card */}
        {profile.bmi && profile.bmiCategory ? (
          <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-semibold text-white">Body Mass Index</h2>
              </div>
              <button
                onClick={() => router.push('/analytics')}
                className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-violet-400"
              >
                View insights <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <BMIGauge bmi={profile.bmi} category={profile.bmiCategory} />
            {bmiTip && (
            <div className="mt-4 rounded-xl border border-white/5 bg-white/3 p-3">
                <p className="text-xs text-slate-400 leading-relaxed">{bmiTip}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-white/6 bg-[#0a0a0a] p-5">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-400" />
            <div>
              <p className="text-sm font-medium text-white">BMI not available</p>
              <p className="text-xs text-slate-400 mt-0.5">Add your height and weight below to calculate your Body Mass Index and get personalised recommendations.</p>
            </div>
          </div>
        )}

        {/* Personal Info */}
        <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Personal Info</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">Tap the pencil icon to edit any field</p>

          <EditableField
            label="Display Name"
            value={profile.name || ''}
            icon={User}
            onSave={v => saveField('name', v)}
          />
          <EditableField
            label="Height"
            value={profile.height_cm ? String(profile.height_cm) : ''}
            unit="cm"
            type="number"
            min={50}
            max={300}
            icon={Ruler}
            onSave={v => saveField('height_cm', v)}
          />
          <EditableField
            label="Weight"
            value={profile.weight_kg ? String(profile.weight_kg) : ''}
            unit="kg"
            type="number"
            min={20}
            max={500}
            step={0.1}
            icon={Scale}
            onSave={v => saveField('weight_kg', v)}
          />
        </div>

        {/* Fitness Goal */}
        <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Fitness Goal</h2>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {GOAL_OPTIONS.map(g => {
              const active = profile.goal === g.value;
              return (
                <button
                  key={g.value}
                  onClick={() => saveGoal(g.value)}
                  disabled={saving}
                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-150 ${
                    active
                      ? 'border-violet-500/20 bg-violet-500/10 text-white'
                      : 'border-white/8 bg-white/3 text-slate-400 hover:border-violet-500/20 hover:text-white'
                  }`}
                >
                  {active && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-violet-500" />
                  )}
                  <span className="text-xl">{g.icon}</span>
                  <span className="text-xs font-semibold leading-tight">{g.label}</span>
                  <span className="text-[9px] text-slate-500 leading-tight hidden sm:block">{g.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick stats row */}
        {(profile.height_cm || profile.weight_kg) && (
          <div className="grid grid-cols-2 gap-3">
            {profile.height_cm && (
              <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Ruler className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs text-slate-400">Height</span>
                </div>
                <span className="text-2xl font-bold text-white">{profile.height_cm}</span>
                <span className="text-sm text-slate-400 ml-1">cm</span>
              </div>
            )}
            {profile.weight_kg && (
              <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Scale className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs text-slate-400">Weight</span>
                </div>
                <span className="text-2xl font-bold text-white">{profile.weight_kg}</span>
                <span className="text-sm text-slate-400 ml-1">kg</span>
              </div>
            )}
          </div>
        )}

        {/* Privacy toggle */}
        <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Privacy</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">Control who can see your posts and activity</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">Private Account</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {profile.is_private ? 'Only you can see your posts' : 'Your posts are visible to everyone'}
              </p>
            </div>
            <button
              onClick={async () => {
                const next = !profile.is_private;
                await patchProfile({ is_private: next });
                setProfile((p) => p ? { ...p, is_private: next } : p);
              }}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                profile.is_private ? 'bg-violet-600' : 'bg-white/10'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                profile.is_private ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Link to full analytics */}
        <button
          onClick={() => router.push('/analytics')}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/6 bg-[#0a0a0a] p-4 text-left transition-all hover:border-violet-500/20 hover:bg-white/5"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
            <TrendingUp className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Full Analytics & Insights</p>
            <p className="text-xs text-slate-400">Workouts, streaks, body trends, recommendations</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
        </button>

        {/* Checkin link */}
        <button
          onClick={() => router.push('/checkin')}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/6 bg-[#0a0a0a] p-4 text-left transition-all hover:border-violet-500/20 hover:bg-white/5"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
            <Award className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Daily Check-In</p>
            <p className="text-xs text-slate-400">Mark today&apos;s gym attendance and track streaks</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
        </button>

      </div>
    </div>
  );
}
