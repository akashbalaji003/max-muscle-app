'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, CheckCircle2, XCircle, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface TermsVersion {
  id: string;
  version: string;
  title: string;
  effective_date: string;
}

export default function ConsentPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const nextUrl      = searchParams.get('next') || '/dashboard';

  const [termsVersion, setTermsVersion]       = useState<TermsVersion | null>(null);
  const [consentAI, setConsentAI]             = useState(false);
  const [termsExpanded, setTermsExpanded]     = useState(false);
  const [loading, setLoading]                 = useState(true);
  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState('');

  useEffect(() => {
    fetch('/api/consent/check')
      .then(async (res) => {
        if (res.status === 401) { router.replace('/login'); return; }
        const data = await res.json();
        if (!data.needs_consent) {
          // Already consented — go straight through
          router.replace(nextUrl);
          return;
        }
        setTermsVersion(data.terms_version);
        setLoading(false);
      })
      .catch(() => { setError('Could not load terms. Please try again.'); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(status: 'accepted' | 'declined') {
    if (!termsVersion) return;
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/consent', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        terms_version_id:    termsVersion.id,
        consent_terms:       status === 'accepted',
        consent_ai_training: status === 'accepted' ? consentAI : false,
        status,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError('Failed to save your choice. Please try again.');
      return;
    }

    // Both accepted and declined → continue to app
    // (declining blocks AI data collection but not app access)
    router.replace(nextUrl);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-red-700/20 border border-red-700/40 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center">Terms & Data Notice</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">
            Before you continue, please review how we use your data.
          </p>
          {termsVersion && (
            <p className="text-[10px] text-slate-600 mt-1">
              v{termsVersion.version} · Effective {new Date(termsVersion.effective_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400 mb-4">
            {error}
          </div>
        )}

        <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden">

          {/* Quick summary */}
          <div className="p-5 space-y-3">
            <SummaryRow icon="✅" text="Workout logs, attendance, and body metrics are used to run your fitness account." />
            <SummaryRow icon="🔒" text="Your phone number, password, posts, and comments are never used for AI training." />
            <SummaryRow icon="🤖" text="With your optional consent, anonymised fitness data helps improve workout recommendations." />
            <SummaryRow icon="↩️" text="You can withdraw AI data consent at any time from your profile settings." />
            <SummaryRow icon="⚕️" text="This app is not a medical service. Consult a healthcare professional before starting any programme." />
          </div>

          {/* Expandable full terms */}
          <div className="border-t border-white/8">
            <button
              onClick={() => setTermsExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              <span>Read full Terms & Data Notice</span>
              {termsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {termsExpanded && (
              <div className="px-5 pb-5 space-y-4 text-xs text-slate-400 leading-relaxed max-h-80 overflow-y-auto">
                <Section title="1. About This Notice">
                  This notice explains how Maximum Muscle Fitness Studio ("we", "us") collects, uses, and stores your data through this platform. By accepting, you agree to these terms.
                </Section>

                <Section title="2. Data We Collect for App Operations">
                  To run your fitness account, we collect:
                  <ul className="mt-2 space-y-1 list-none">
                    <Li>Name (optional), phone number, and password (encrypted)</Li>
                    <Li>Gym membership records and attendance history</Li>
                    <Li>Workout logs — exercises, sets, reps, and weights</Li>
                    <Li>Body metrics you choose to enter (height, weight, fitness goal)</Li>
                    <Li>Progress photos you choose to upload</Li>
                    <Li>Social interactions (likes, comments, follows) within the app</Li>
                  </ul>
                </Section>

                <Section title="3. Optional AI & Analytics Training Data">
                  With your separate optional consent, we may use de-identified, pseudonymous fitness data to improve workout recommendations and future AI features. This dataset includes:
                  <ul className="mt-2 space-y-1 list-none">
                    <Li>Weekly training volume, session frequency, and adherence patterns</Li>
                    <Li>Strength progression by exercise (top weight, estimated 1-rep max)</Li>
                    <Li>Body weight trends over time</Li>
                    <Li>Assigned workout plan type and source</Li>
                    <Li>Attendance patterns</Li>
                  </ul>
                  <p className="mt-3 font-semibold text-slate-300">We do NOT use for AI training:</p>
                  <ul className="mt-1 space-y-1 list-none">
                    <Li deny>Your phone number or contact details</Li>
                    <Li deny>Your password or authentication data</Li>
                    <Li deny>Social posts, comments, or likes</Li>
                    <Li deny>Any data that directly identifies you</Li>
                  </ul>
                  <p className="mt-2">In the AI dataset, your data is referenced only by an internal identifier — never by name or phone number.</p>
                </Section>

                <Section title="4. How Your Data Is Protected">
                  <ul className="mt-1 space-y-1 list-none">
                    <Li>All data is stored securely with backend-only server access</Li>
                    <Li>AI training data is kept in separate, access-controlled tables</Li>
                    <Li>No third parties receive your personal data</Li>
                    <Li>All consent decisions are stored with full audit history</Li>
                  </ul>
                </Section>

                <Section title="5. Your Rights">
                  <ul className="mt-1 space-y-1 list-none">
                    <Li>You can decline AI data collection and still use all app features</Li>
                    <Li>You can withdraw AI data consent at any time from Settings → Privacy</Li>
                    <Li>Withdrawing stops future AI data collection for your account</Li>
                    <Li>Operational data (workouts, attendance) is retained per standard policy</Li>
                  </ul>
                </Section>

                <Section title="6. Important Disclaimer">
                  This app is NOT a medical service. Nothing in this app constitutes medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional before starting any fitness programme.
                </Section>
              </div>
            )}
          </div>

          {/* AI consent checkbox */}
          <div className="border-t border-white/8 px-5 py-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={consentAI}
                  onChange={(e) => setConsentAI(e.target.checked)}
                  className="w-4 h-4 rounded accent-red-600 cursor-pointer"
                />
              </div>
              <div>
                <p className="text-sm text-white font-medium group-hover:text-slate-200 transition-colors">
                  Allow anonymised fitness data for AI improvements <span className="text-slate-500 font-normal">(optional)</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your workout trends and progress (no personal details) may be used to improve recommendations. You can withdraw this at any time.
                </p>
              </div>
            </label>
          </div>

          {/* Decline notice */}
          <div className="border-t border-white/8 px-5 py-3 bg-amber-500/5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-500">
                Declining removes access to personalised recommendations but does not affect basic app features.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-white/8 p-5 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => submit('declined')}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Decline
            </button>
            <button
              onClick={() => submit('accepted')}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-700 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg disabled:opacity-50 active:scale-[0.98]"
            >
              {submitting
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <CheckCircle2 className="w-4 h-4" />
              }
              Accept &amp; Continue
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-700 mt-4">
          By accepting you agree to our Terms of Use. Both choices are saved securely.
        </p>
      </div>
    </div>
  );
}

// ── Small helper components ───────────────────────────────────────────────────

function SummaryRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base leading-none mt-0.5 shrink-0">{icon}</span>
      <p className="text-sm text-slate-400 leading-snug">{text}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-slate-300 mb-1">{title}</p>
      <div className="text-slate-500">{children}</div>
    </div>
  );
}

function Li({ children, deny }: { children: React.ReactNode; deny?: boolean }) {
  return (
    <li className="flex items-start gap-1.5">
      <span className={deny ? 'text-rose-500' : 'text-emerald-500'}>
        {deny ? '✗' : '•'}
      </span>
      <span>{children}</span>
    </li>
  );
}
