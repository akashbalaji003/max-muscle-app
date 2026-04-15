'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { Exercise } from '@/types';

interface LeaderboardEntry {
  id: string;
  max_weight: number;
  achieved_at: string;
  rank: number;
  is_current_user: boolean;
  users: { id: string; phone_number: string; name: string | null };
}

const MEDAL_EMOJI  = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['text-amber-400', 'text-slate-300', 'text-amber-700'];
const PODIUM_BG    = [
  'bg-slate-700/30 border-slate-500/30',
  'bg-amber-600/20 border-amber-500/30',
  'bg-amber-900/20 border-amber-800/30',
];

// ─── Comprehensive exercise database ─────────────────────────────────────────
// Keyed by muscle group → list of exercise names (matched to DB names where possible)

const MUSCLE_GROUPS = [
  { key: 'Chest',     emoji: '🏋️', color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20' },
  { key: 'Back',      emoji: '🔙', color: 'text-blue-400',     bg: 'bg-blue-500/10 border-blue-500/20' },
  { key: 'Shoulders', emoji: '💪', color: 'text-violet-400',   bg: 'bg-violet-500/10 border-violet-500/20' },
  { key: 'Biceps',    emoji: '💥', color: 'text-amber-400',    bg: 'bg-amber-500/10 border-amber-500/20' },
  { key: 'Triceps',   emoji: '⚡', color: 'text-orange-400',   bg: 'bg-orange-500/10 border-orange-500/20' },
  { key: 'Legs',      emoji: '🦵', color: 'text-emerald-400',  bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { key: 'Core',      emoji: '🎯', color: 'text-cyan-400',     bg: 'bg-cyan-500/10 border-cyan-500/20' },
  { key: 'Cardio',    emoji: '🏃', color: 'text-pink-400',     bg: 'bg-pink-500/10 border-pink-500/20' },
] as const;

type MuscleKey = typeof MUSCLE_GROUPS[number]['key'];

const EXERCISES_BY_MUSCLE: Record<MuscleKey, string[]> = {
  Chest: [
    'Bench Press', 'Incline Bench Press', 'Decline Bench Press',
    'Dumbbell Fly', 'Incline Dumbbell Press', 'Cable Crossover',
    'Chest Dips', 'Machine Chest Press', 'Pec Deck Machine',
    'Push-Up', 'Smith Machine Bench Press',
  ],
  Back: [
    'Deadlift', 'Barbell Row', 'T-Bar Row', 'Seated Cable Row',
    'Single-Arm Dumbbell Row', 'Chest-Supported Row', 'Smith Machine Row',
    'Good Morning', 'Hyperextension', 'Rack Pull',
  ],
  Shoulders: [
    'Overhead Press', 'Dumbbell Shoulder Press', 'Arnold Press',
    'Lateral Raise', 'Front Raise', 'Face Pull',
    'Upright Row', 'Machine Shoulder Press', 'Cable Lateral Raise',
    'Rear Delt Fly', 'Shrugs',
  ],
  Biceps: [
    'Barbell Curl', 'Dumbbell Curl', 'Hammer Curl',
    'Concentration Curl', 'EZ Bar Curl', 'Cable Curl',
    'Incline Dumbbell Curl', 'Machine Bicep Curl', 'Spider Curl',
    'Preacher Curl', 'Reverse Curl',
  ],
  Triceps: [
    'Tricep Pushdown', 'Skull Crusher', 'Close-Grip Bench Press',
    'Overhead Tricep Extension', 'Diamond Push-Up', 'Tricep Dips',
    'Cable Overhead Extension', 'Rope Pushdown', 'Machine Tricep Press',
    'Kickback',
  ],
  Legs: [
    'Squat', 'Front Squat', 'Hack Squat', 'Leg Press',
    'Romanian Deadlift', 'Leg Curl', 'Leg Extension',
    'Bulgarian Split Squat', 'Lunges', 'Calf Raise',
    'Seated Calf Raise', 'Hip Thrust', 'Glute Bridge',
    'Step-Ups', 'Sumo Squat',
  ],
  Core: [
    'Plank', 'Ab Wheel', 'Cable Crunch', 'Hanging Leg Raise',
    'Russian Twist', 'Side Plank', 'Dragon Flag',
    'Decline Crunch', 'Machine Crunch', 'Landmine Oblique Twist',
  ],
  Cardio: [
    'Treadmill', 'Stationary Bike', 'Rowing Machine', 'Elliptical',
    'Stair Climber', 'Jump Rope', 'Battle Ropes',
  ],
};

// Lats sub-group merged into Back for simplicity, handled via back exercises
const BACK_EXTRAS: Record<string, string[]> = {
  Lats: [
    'Lat Pulldown', 'Pull-Up', 'Chin-Up', 'Wide-Grip Lat Pulldown',
    'Straight-Arm Pulldown', 'Close-Grip Lat Pulldown',
  ],
};

export default function LeaderboardPage() {
  const router = useRouter();

  // Flat exercise list from DB (for matching)
  const [dbExercises, setDbExercises] = useState<Exercise[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  // Exercise IDs that have at least one PR logged by any gym member
  const [exercisesWithPRs, setExercisesWithPRs] = useState<Set<string>>(new Set());

  // Navigation state
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<{ id: string; name: string } | null>(null);

  // Leaderboard
  const [board, setBoard]   = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/leaderboard');
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setDbExercises(data.exercises || []);
      if (data.exercises_with_prs?.length) {
        setExercisesWithPRs(new Set(data.exercises_with_prs as string[]));
      }
      // Auto-select first popular exercise's board if available
      if (data.leaderboard?.length) setBoard(data.leaderboard);
      setInitialLoading(false);
    }
    load();
  }, [router]);

  // ── Resolve exercise name → DB exercise id ───────────────────────────────
  function resolveExercise(name: string): Exercise | undefined {
    const lower = name.toLowerCase();
    // Exact match first
    const exact = dbExercises.find((e) => e.name.toLowerCase() === lower);
    if (exact) return exact;
    // Partial match
    return dbExercises.find(
      (e) => e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase()),
    );
  }

  // ── Fetch leaderboard for an exercise ────────────────────────────────────
  async function fetchBoard(exerciseId: string) {
    setLoading(true);
    const res = await fetch(`/api/leaderboard?exercise_id=${exerciseId}`);
    if (res.ok) { const data = await res.json(); setBoard(data.leaderboard || []); }
    setLoading(false);
  }

  function handleSelectExercise(name: string) {
    const db = resolveExercise(name);
    if (!db) {
      setSelectedExercise({ id: '', name });
      setBoard([]);
      return;
    }
    setSelectedExercise({ id: db.id, name: db.name });
    fetchBoard(db.id);
  }

  function displayName(entry: LeaderboardEntry, maxLen = 12) {
    const name = entry.users?.name;
    if (!name) return `+${entry.users?.phone_number?.slice(-4) || '????'}`;
    // If full name fits, show it; otherwise show first name only
    if (name.length <= maxLen) return name;
    return name.split(' ')[0];
  }

  // ── Exercise list for selected muscle ─────────────────────────────────────
  function getExercisesForMuscle(muscle: string): string[] {
    if (muscle === 'Back') {
      return [...(EXERCISES_BY_MUSCLE['Back'] ?? []), ...(BACK_EXTRAS['Lats'] ?? [])];
    }
    return (EXERCISES_BY_MUSCLE as Record<string, string[]>)[muscle] ?? [];
  }

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="space-y-5">
        <div>
          <div className="skeleton h-7 w-36 mb-1 rounded" />
          <div className="skeleton h-4 w-52 mt-1 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Step 3: Show leaderboard ─────────────────────────────────────────────
  if (selectedExercise) {
    return (
      <div className="space-y-5 fade-in">
        {/* Back breadcrumb */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectedExercise(null); setBoard([]); }}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {selectedMuscle}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
          <span className="text-sm text-white font-medium truncate">{selectedExercise.name}</span>
        </div>

        <div>
          <h1 className="font-display text-3xl sm:text-5xl text-white leading-none">LEADERBOARD</h1>
          <p className="text-sm text-slate-400 mt-0.5">{selectedExercise.name} · Top weights</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="glass-card space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-4 w-1/2 rounded" />
                  <div className="skeleton h-3 w-1/4 rounded" />
                </div>
                <div className="skeleton h-5 w-16 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && selectedExercise.id === '' && (
          <Card className="text-center py-12">
            <Trophy className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">This exercise isn&apos;t in the database yet.</p>
            <p className="text-slate-600 text-sm mt-1">Log it in a workout to unlock the leaderboard!</p>
          </Card>
        )}

        {!loading && selectedExercise.id !== '' && board.length === 0 && (
          <Card className="text-center py-12">
            <Trophy className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No PRs yet for this exercise.</p>
            <p className="text-slate-600 text-sm mt-1">Be the first to log it!</p>
          </Card>
        )}

        {!loading && board.length > 0 && (
          <Card className="overflow-hidden p-0 fade-in">
            {/* Podium */}
            {board.length >= 3 && (
              <div className="flex items-end justify-center gap-4 p-5 bg-gradient-to-b from-red-900/10 to-transparent border-b border-white/5">
                {[board[1], board[0], board[2]].map((entry, podiumIdx) => {
                  const rankIdx  = entry.rank - 1;
                  const isFirst  = podiumIdx === 1;
                  return (
                    <div key={entry.id} className="flex flex-col items-center gap-1.5">
                      <span className="text-2xl">{MEDAL_EMOJI[rankIdx]}</span>
                      <p className={`font-bold ${isFirst ? 'text-lg' : 'text-sm'} ${MEDAL_COLORS[rankIdx]}`}>
                        {entry.max_weight} kg
                      </p>
                      <p className={`text-xs max-w-[72px] text-center truncate ${entry.is_current_user ? 'text-red-300 font-bold' : 'text-slate-300'}`}>
                        {displayName(entry)}
                      </p>
                      <div className={`${isFirst ? 'h-16' : 'h-10'} w-14 border rounded-t-lg flex items-end justify-center pb-1.5 ${PODIUM_BG[podiumIdx]}`}>
                        <span className="text-xs font-bold text-slate-400">#{entry.rank}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="divide-y divide-white/5">
              {board.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    entry.is_current_user ? 'bg-red-600/5 border-l-2 border-red-600' : 'hover:bg-white/2'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 text-center font-bold text-sm flex-shrink-0 ${MEDAL_COLORS[entry.rank - 1] || 'text-slate-500'}`}>
                      {entry.rank <= 3
                        ? <span className="text-base">{MEDAL_EMOJI[entry.rank - 1]}</span>
                        : `#${entry.rank}`}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${entry.is_current_user ? 'text-red-300' : 'text-white'}`}>
                        {displayName(entry)}
                        {entry.is_current_user && <span className="ml-1.5 text-xs text-red-500">(you)</span>}
                      </p>
                      <p className="text-xs text-slate-500">{new Date(entry.achieved_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-bold text-amber-400">{entry.max_weight} kg</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // ─── Step 2: Show exercises for selected muscle ────────────────────────────
  if (selectedMuscle) {
    const exercises = getExercisesForMuscle(selectedMuscle);
    const muscleInfo = MUSCLE_GROUPS.find((m) => m.key === selectedMuscle);

    return (
      <div className="space-y-5 fade-in">
        {/* Back */}
        <button
          onClick={() => setSelectedMuscle(null)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> All Muscle Groups
        </button>

        <div>
          <h1 className="font-display text-3xl sm:text-5xl text-white leading-none">
            {selectedMuscle.toUpperCase()}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Select an exercise to view rankings</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {exercises.map((name) => {
            const dbEx = resolveExercise(name);
            // Only show "Tracked" if someone in the gym has actually logged this exercise
            const isTracked = dbEx ? exercisesWithPRs.has(dbEx.id) : false;
            return (
              <button
                key={name}
                onClick={() => handleSelectExercise(name)}
                className="flex items-center justify-between px-4 py-3.5 glass-card hover:border-red-600/40 text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-lg flex-shrink-0 ${muscleInfo?.color || 'text-red-400'}`}>{muscleInfo?.emoji}</span>
                  <span className="text-sm font-medium text-white truncate">{name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isTracked && <span className="text-[10px] text-emerald-400/70 font-medium">Tracked</span>}
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Step 1: Show muscle groups ────────────────────────────────────────────
  return (
    <div className="space-y-5 fade-in">
      <div>
        <p className="text-[11px] tracking-[0.2em] uppercase text-slate-500 mb-1">Rankings</p>
        <h1 className="font-display text-3xl sm:text-5xl text-white leading-none">LEADERBOARD</h1>
        <p className="text-sm text-slate-400 mt-1.5">Select a muscle group to view top lifters</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MUSCLE_GROUPS.map((mg) => {
          // Count exercises with actual PRs in this muscle group
          const trackedCount = getExercisesForMuscle(mg.key).filter((name) => {
            const dbEx = resolveExercise(name);
            return dbEx && exercisesWithPRs.has(dbEx.id);
          }).length;
          return (
            <button
              key={mg.key}
              onClick={() => setSelectedMuscle(mg.key)}
              className={`glass-card p-4 text-left hover:border-opacity-60 transition-all active:scale-[0.97] border ${mg.bg} group`}
            >
              <span className="text-3xl block mb-2">{mg.emoji}</span>
              <p className={`font-display text-base font-bold ${mg.color} leading-none`}>{mg.key}</p>
              <p className="text-[11px] text-slate-600 mt-1">
                {getExercisesForMuscle(mg.key).length} exercises
                {trackedCount > 0 && ` · ${trackedCount} tracked`}
              </p>
            </button>
          );
        })}
      </div>

      {/* Quick tips */}
      <div className="glass-card p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-400" /> How rankings work
        </p>
        <div className="space-y-2 text-xs text-slate-500">
          <p>🏋️ Rankings are based on your <span className="text-slate-300">personal records</span> — the highest weight lifted for any exercise.</p>
          <p>📈 Log workouts regularly to climb the leaderboard.</p>
          <p>🔥 &quot;Tracked&quot; exercises already have data from your gym members.</p>
        </div>
      </div>
    </div>
  );
}
