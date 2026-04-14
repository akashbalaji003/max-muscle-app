'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Flame, TrendingUp, Weight } from 'lucide-react';
import { StatCard } from '@/components/ui/Card';
import { formatVolume, CATEGORY_COLORS } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { AnalyticsData } from '@/types';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0f0f0f] border border-white/10 rounded-xl px-3 py-2 text-sm">
        <p className="text-slate-400">{label}</p>
        <p className="text-white font-semibold">{payload[0].value.toLocaleString()} kg</p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/analytics');
      if (res.status === 401) { router.push('/login'); return; }
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-5xl text-white leading-none">ANALYTICS</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your training overview</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Workouts" value={data?.totalWorkouts ?? 0} icon={<Dumbbell className="w-5 h-5" />} color="red" />
        <StatCard label="Total Volume" value={formatVolume(data?.totalVolume ?? 0)} icon={<Weight className="w-5 h-5" />} color="violet" />
        <StatCard label="Current Streak" value={`${data?.currentStreak ?? 0}d`} icon={<Flame className="w-5 h-5" />} color="amber" />
        <StatCard label="Longest Streak" value={`${data?.longestStreak ?? 0}d`} icon={<TrendingUp className="w-5 h-5" />} color="emerald" />
      </div>

      {/* Weekly volume bar chart */}
      <div className="glass-card p-5">
        <h2 className="font-semibold text-white mb-4">Weekly Volume (kg)</h2>
        {(data?.weeklyWorkouts?.length ?? 0) > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data!.weeklyWorkouts} barCategoryGap="35%">
              <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
              <Bar dataKey="volume" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-sm py-8 text-center">Log workouts to see volume data</p>
        )}
      </div>

      {/* Monthly workouts bar */}
      <div className="glass-card p-5">
        <h2 className="font-semibold text-white mb-4">Monthly Workouts</h2>
        {(data?.monthlyWorkouts?.length ?? 0) > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data!.monthlyWorkouts} barCategoryGap="35%">
              <XAxis dataKey="week" stroke="#475569" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip cursor={{ fill: 'rgba(99,102,241,0.08)' }} contentStyle={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-sm py-8 text-center">No monthly data yet</p>
        )}
      </div>

      {/* Body part distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-4">Body Part Distribution</h2>
          {(data?.bodyPartDistribution?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data!.bodyPartDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data!.bodyPartDistribution.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6366f1'} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
                />
                <Tooltip
                  contentStyle={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-sm py-8 text-center">Log workouts to see distribution</p>
          )}
        </div>

        {/* Recent PRs */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-4">Recent PRs</h2>
          {(data?.recentPRs?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {data!.recentPRs.map((pr) => (
                <div key={pr.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{(pr as { exercises?: { name: string } }).exercises?.name}</p>
                    <p className="text-xs text-slate-500">{new Date((pr as { achieved_at: string }).achieved_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-lg font-bold text-amber-400">{pr.max_weight} kg</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm py-8 text-center">No PRs yet — keep lifting!</p>
          )}
        </div>
      </div>
    </div>
  );
}
