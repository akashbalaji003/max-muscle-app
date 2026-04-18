'use client';
import { useEffect, useState } from 'react';
import { QrCode, Download, RefreshCw, Shield } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function AdminQRPage() {
  const [qr, setQr] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);

  async function fetchQR() {
    setLoading(true);
    const res = await fetch('/api/qr');
    if (res.ok) {
      const data = await res.json();
      setQr(data.qr);
      setUrl(data.url);
    }
    setLoading(false);
  }

  useEffect(() => { fetchQR(); }, []);

  function downloadQR() {
    const a = document.createElement('a');
    a.href = qr;
    a.download = 'fithub-checkin-qr.png';
    a.click();
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#000000] px-4 py-6 text-white sm:px-6">
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.15); }
          50% { box-shadow: 0 0 40px rgba(124,58,237,0.35); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shine-sweep {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(250%) skewX(-12deg); }
        }
        .btn-shine {
          position: relative;
          overflow: hidden;
        }
        .btn-shine::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
          transform: translateX(-100%) skewX(-12deg);
          pointer-events: none;
        }
        @media (hover: hover) {
          .btn-shine:hover::after {
            animation: shine-sweep 0.5s cubic-bezier(0.22,1,0.36,1) forwards;
          }
        }
      `}</style>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-violet-600/6 blur-[120px] sm:h-[420px] sm:w-[420px] sm:blur-[160px]" />
        <div className="absolute bottom-0 right-0 h-[220px] w-[220px] rounded-full bg-indigo-700/5 blur-[120px] sm:h-[360px] sm:w-[360px] sm:blur-[150px]" />
        <div className="absolute left-[-80px] top-1/2 h-[200px] w-[200px] rounded-full bg-purple-800/4 blur-[120px] sm:h-[320px] sm:w-[320px] sm:blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center">
        <div className="mb-8">
          <Link href="/admin/dashboard" className="inline-flex min-h-[44px] items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-300">← Admin Dashboard</Link>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/6 bg-[#0a0a0a] p-4 shadow-[0_0_40px_rgba(124,58,237,0.08)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10" style={{ animation: 'glow-pulse 3s ease-in-out infinite' }}>
            <Shield className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h1 className="font-display text-xl tracking-wide text-white">Gym QR Code</h1>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">Print or display for member check-ins</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 text-center shadow-[0_0_40px_rgba(124,58,237,0.08)] sm:p-6" style={{ animation: 'fade-up 300ms ease-out both' }}>
          <p className="text-slate-400 text-sm mb-6">
            Print or display this QR code at your gym. Members scan it to check in.
          </p>

          {loading ? (
            <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-xl bg-[#000000]">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            </div>
          ) : qr ? (
            <img src={qr} alt="Check-in QR Code" className="mx-auto h-64 w-64 rounded-xl bg-white p-2" />
          ) : (
            <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-xl bg-[#000000]">
              <QrCode className="h-16 w-16 text-slate-700" />
            </div>
          )}

          {url && (
            <p className="text-xs text-slate-600 mt-4 break-all">{url}</p>
          )}

          <div className="mt-6 flex gap-2">
            <Button onClick={downloadQR} disabled={!qr} className="btn-shine flex-1">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button variant="secondary" onClick={fetchQR} className="min-h-[44px]">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
