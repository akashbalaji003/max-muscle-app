'use client';

import { useState } from 'react';
import { Phone, X } from 'lucide-react';
import Link from 'next/link';

const PHONE_NUMBERS = [
  { number: '8056329329', label: 'Primary', href: 'tel:+918056329329' },
  { number: '7530007332', label: 'Secondary', href: 'tel:+447530007332' },
];

export default function CoachContactModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* CTA Button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-all text-xs active:scale-95"
      >
        <span>Start Your Journey</span>
        <Phone className="w-3.5 h-3.5" />
      </button>

      {/* Modal Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          {/* Modal Content */}
          <div
            className="bg-[#0a0a0a] border border-red-600/30 rounded-2xl shadow-2xl shadow-red-900/50 max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-white tracking-wide">
                  Call Us
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Get in touch with our coaches
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Phone Numbers */}
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

            {/* Divider */}
            <div className="px-6 py-3 border-t border-white/5">
              <p className="text-xs text-slate-600 text-center">
                Or continue to sign up
              </p>
            </div>

            {/* CTA */}
            <div className="p-6 border-t border-white/5 flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-600 rounded-lg transition-colors text-center"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
