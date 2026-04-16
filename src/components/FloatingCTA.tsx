'use client';

import { useState } from 'react';
import { Phone, X, ArrowRight } from 'lucide-react';

const PHONE_NUMBERS = [
  { number: '8056329329', label: 'Primary', href: 'tel:+918056329329' },
  { number: '7530007332', label: 'Secondary', href: 'tel:+447530007332' },
];

export default function FloatingCTA() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Floating button ── */}
      <div className="fixed bottom-6 right-6 z-40">
        <style>{`
          @keyframes float-pulse {
            0%, 100% { box-shadow: 0 0 20px rgba(220, 38, 38, 0.4), inset 0 0 20px rgba(220, 38, 38, 0.1); }
            50% { box-shadow: 0 0 40px rgba(220, 38, 38, 0.6), inset 0 0 20px rgba(220, 38, 38, 0.2); }
          }
          .float-cta {
            animation: float-pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>
        <button
          onClick={() => setOpen(true)}
          className="float-cta group relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-700 border border-red-500/50 backdrop-blur-md hover:border-red-400 hover:from-red-500 hover:to-red-600 active:scale-95 transition-all duration-200 shadow-2xl shadow-red-900/50"
          aria-label="Call us to join"
        >
          {/* Background glow */}
          <div className="absolute inset-0 rounded-full bg-red-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Icon + label */}
          <div className="relative flex flex-col items-center justify-center gap-0.5">
            <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
            <span className="text-[9px] font-bold text-white tracking-widest leading-none whitespace-nowrap">JOIN</span>
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap font-medium">
              Call us to join
              <div className="absolute top-full right-2 w-2 h-2 bg-white/10 rotate-45 border-r border-b border-white/20" />
            </div>
          </div>
        </button>
      </div>

      {/* ── Modal ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#0a0a0a] border border-red-600/30 rounded-2xl shadow-2xl shadow-red-900/50 max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-white tracking-wide">
                  Call Us to Book
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Reach out and start your journey today
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Phone numbers */}
            <div className="p-6 space-y-3">
              {PHONE_NUMBERS.map((phone) => (
                <a
                  key={phone.number}
                  href={phone.href}
                  className="group flex items-center gap-4 p-4 bg-gradient-to-r from-red-600/10 to-red-600/5 hover:from-red-600/20 hover:to-red-600/10 border border-red-600/20 hover:border-red-600/40 rounded-xl transition-all"
                >
                  <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center group-hover:bg-red-600/30 transition-colors flex-shrink-0">
                    <Phone className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 uppercase tracking-widest">
                      {phone.label}
                    </p>
                    <p className="text-lg font-semibold text-white font-mono group-hover:text-red-400 transition-colors">
                      {phone.number}
                    </p>
                  </div>
                  <div className="text-red-400 group-hover:text-red-300 transition-colors flex-shrink-0">
                    →
                  </div>
                </a>
              ))}
            </div>

            {/* Footer note */}
            <div className="px-6 pb-6">
              <p className="text-xs text-slate-600 text-center">
                Tap a number to call directly
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
