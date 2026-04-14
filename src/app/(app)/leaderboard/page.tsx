'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Medal, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { CATEGORY_COLORS } from '@/lib/utils';
import type { Exercise } from '@/types';

interface LeaderboardEntry {
  id: string;
  max_weight: number;
  achieved_at: string;
  rank: number;
  is_current_user: boolean;
  users: { id: string; phone_number: string; name: string | null };
}

const RANK_STYLES = ['text-amber-400', 'text-slate-300', 'text-amber-700'];

const ALL_MUSCLE_GROUPS = [
  'All',
  'Chest', 'Back', 'Lats', 'Shoulders',
  'Biceps', 'Triceps', 'Arms',
  'Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves',
  'Core', 'Cardio',
];

export default function LeaderboardPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState('');
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeMuscle, setActiveMuscle] = useState('All');

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/leaderboard');
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setExercises(data.exercises || []);
      setBoard(data.leaderboard || []);
      setSelected(data.selected_exercise_id || '');
    }
    load();
  }, [router]);

  async function changeExercise(exerciseId: string) {
    if (exerciseId === selected) return;
    setSelected(exerciseId);
    setLoading(true);
    const res = await fetch(`/api/leaderboard?exercise_id=${exerciseId}`);
    if (res.ok) { const data = await res.json(); setBoard(data.leaderboard || []); }
    setLoading(false);
  }

  function displayName(entry: LeaderboardEntry) {
    return entry.users?.name || `+${entry.users?.phone_number?.slice(-4) || '????'}`;
  }

  function matchesMuscle(ex: Exercise, muscle: string) {
    if (muscle === 'All') return true;
    const mg = (ex.muscle_group || '').toLowerCase();
    const cat = (ex.category || '').toLowerCase();
    const m = muscle.toLowerCase();
    return mg.includes(m) || mg === m || cat.includes(m) || cat === m;
  }

  const filteredExercises = exercises.filter((ex) => {
    const matchMuscle = matchesMuscle(ex, activeMuscle);
    const matchSearch = search === '' || ex.name.toLowerCase().includes(search.toLowerCase());
    return matchMuscle && matchSearch;
  });

  function countForMuscle(muscle: string) {
    return exercises.filter((ex) => matchesMuscle(ex, muscle)).length;
  }

  const selectedExercise = exercises.find((e) => e.id === selected);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">Personal records — ranked by top weight</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search exercise..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#0f0f0f] border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Muscle group filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {ALL_MUSCLE_GROUPS.map((muscle) => {
          const count = countForMuscle(muscle);
          const active = activeMuscle === muscle;
          const empty = count === 0;
          return (
            <button
              key={muscle}
              onClick={() => setActiveMuscle(muscle)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                active
                  ? 'bg-indigo-600 text-white'
                  : empty
                  ? 'bg-[#0f0f0f] text-slate-600 border border-white/5 cursor-default'
                  : 'bg-[#0f0f0f] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {muscle}
              {muscle !== 'All' && (
                <span className={`text-[10px] rounded-full px-1 min-w-[16px] text-center ${
                  active ? 'bg-white/20 text-white' : empty ? 'text-slate-700' : 'text-slate-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Exercise list */}
        <div className="lg:col-span-1">
          <div className="glass-card overflow-hidden p-0 max-h-[60vh] overflow-y-auto">
            {filteredExercises.length === 0 && (
              <p className="p-4 text-center text-slate-500 text-sm">No exercises found</p>
            )}
            {filteredExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => changeExercise(ex.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0 ${
                  selected === ex.id ? 'bg-indigo-600/15 text-indigo-300' : 'hover:bg-white/3 text-slate-300'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: CATEGORY_COLORS[ex.category] || '#6366f1' }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{ex.name}</p>
                  {ex.muscle_group && <p className="text-xs text-slate-500 truncate">{ex.muscle_group}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard panel */}
        <div className="lg:col-span-2">
          {selectedExercise && (
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">{selectedExercise.name}</h2>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedExercise.muscle_group && (
                  <span className="text-xs bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    {selectedExercise.muscle_group}
                  </span>
                )}
                {selectedExercise.equipment && (
                  <span className="text-xs bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {selectedExercise.equipment}
                  </span>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="glass-card flex items-center justify-center py-16">
              <div className="animate-spin w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full" />
            </div>
          )}

          {!loading && board.length === 0 && (
            <Card className="text-center py-12">
              <Trophy className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No PRs yet for this exercise.</p>
              <p className="text-slate-600 text-sm mt-1">Be the first to log it!</p>
            </Card>
          )}

          {!loading && board.length > 0 && (
            <Card className="overflow-hidden p-0">
              {/* Top 3 podium if ≥ 3 entries */}
              {board.length >= 3 && (
                <div className="flex items-end justify-center gap-4 p-5 bg-gradient-to-b from-indigo-900/10 to-transparent border-b border-white/5">
                  {[board[1], board[0], board[2]].map((entry, i) => (
                    <div key={entry.id} className="flex flex-col items-center gap-2">
                      <p className={`font-bold ${i === 1 ? 'text-xl' : 'text-base'} ${RANK_STYLES[entry.rank - 1]}`}>
                        {entry.max_weight} kg
                      </p>
                      <p className={`text-xs max-w-[72px] text-center truncate ${entry.is_current_user ? 'text-indigo-300 font-bold' : 'text-slate-300'}`}>
                        {displayName(entry)}
                      </p>
                      <div className={`${i === 1 ? 'h-16' : 'h-10'} w-14 bg-indigo-600/20 border border-indigo-500/20 rounded-t-lg flex items-center justify-center`}>
                        <span className="text-xs font-bold text-indigo-400">#{entry.rank}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="divide-y divide-white/5">
                {board.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between px-4 py-3 transition-colors ${
                      entry.is_current_user ? 'bg-indigo-500/5 border-l-2 border-indigo-500' : 'hover:bg-white/2'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 text-center font-bold text-sm ${RANK_STYLES[entry.rank - 1] || 'text-slate-500'}`}>
                        {entry.rank <= 3 ? <Medal className="w-4 h-4 inline" /> : `#${entry.rank}`}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${entry.is_current_user ? 'text-indigo-300' : 'text-white'}`}>
                          {displayName(entry)}
                          {entry.is_current_user && <span className="ml-1.5 text-xs text-indigo-500">(you)</span>}
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
      </div>
    </div>
  );
}
