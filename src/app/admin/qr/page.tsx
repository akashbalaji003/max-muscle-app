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
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <Link href="/admin/dashboard" className="text-slate-400 hover:text-white text-sm">← Admin Dashboard</Link>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 bg-amber-600 rounded-xl flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Gym QR Code</h1>
        </div>

        <div className="glass-card p-6 text-center">
          <p className="text-slate-400 text-sm mb-6">
            Print or display this QR code at your gym. Members scan it to check in.
          </p>

          {loading ? (
            <div className="w-64 h-64 mx-auto flex items-center justify-center bg-[#000000] rounded-xl">
              <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" />
            </div>
          ) : qr ? (
            <img src={qr} alt="Check-in QR Code" className="w-64 h-64 mx-auto rounded-xl bg-white p-2" />
          ) : (
            <div className="w-64 h-64 mx-auto flex items-center justify-center bg-[#000000] rounded-xl">
              <QrCode className="w-16 h-16 text-slate-700" />
            </div>
          )}

          {url && (
            <p className="text-xs text-slate-600 mt-4 break-all">{url}</p>
          )}

          <div className="flex gap-2 mt-6">
            <Button onClick={downloadQR} disabled={!qr} className="flex-1">
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button variant="secondary" onClick={fetchQR}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
