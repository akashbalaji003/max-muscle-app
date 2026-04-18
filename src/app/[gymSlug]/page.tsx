import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Dumbbell, ChevronRight, MapPin, Phone, Clock } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';

interface Props {
  params: Promise<{ gymSlug: string }>;
}

export default async function GymPublicPage({ params }: Props) {
  const { gymSlug } = await params;

  // maxmuscle has a dedicated hand-crafted page
  if (gymSlug === 'maxmuscle') {
    redirect('/maxmuscle');
  }

  // For other gyms, look up from DB
  const { data: gym } = await supabaseAdmin
    .from('gyms')
    .select('*')
    .eq('slug', gymSlug)
    .maybeSingle();

  if (!gym) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center text-center p-6">
        <div>
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-slate-600" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Gym not found</h1>
          <p className="text-slate-400 text-sm mb-6">No gym found for <code className="text-slate-300">/{gymSlug}</code></p>
          <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm transition-colors">
            ← Back to GymOS
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = gym.primary_color || '#E11D1D';

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col font-body overflow-x-hidden">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5 sm:px-8 py-3 border-b border-white/5 bg-[#000000]/95 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: primaryColor + '33' }}>
            <Dumbbell className="w-5 h-5" style={{ color: primaryColor }} />
          </div>
          <span className="font-bold text-white text-base">{gym.name}</span>
        </div>
        <Link
          href={`/${gymSlug}/login`}
          className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-all"
          style={{ backgroundColor: primaryColor }}
        >
          Member Login
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-5 pt-20 pb-16 text-center">
        <div className="max-w-lg">
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 tracking-tight leading-tight">
            {gym.name}
          </h1>
          {gym.address && (
            <p className="flex items-center justify-center gap-1.5 text-sm text-slate-400 mb-8">
              <MapPin className="w-4 h-4" /> {gym.address}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/${gymSlug}/signup`}
              className="flex items-center justify-center gap-2 font-semibold px-6 py-3.5 rounded-xl text-white transition-all text-sm"
              style={{ backgroundColor: primaryColor }}
            >
              Join Now <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href={`/${gymSlug}/login`}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/8 text-slate-200 font-medium px-6 py-3.5 rounded-xl border border-white/8 transition-all text-sm"
            >
              Member Login
            </Link>
          </div>

          {gym.phone && (
            <a href={`tel:${gym.phone}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mt-6">
              <Phone className="w-4 h-4" /> {gym.phone}
            </a>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 px-5 text-center text-xs text-slate-700">
        Powered by{' '}
        <Link href="/" className="text-slate-600 hover:text-slate-400 transition-colors">GymOS</Link>
      </footer>
    </div>
  );
}
