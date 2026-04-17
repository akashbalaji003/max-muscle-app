'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface DarkSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
}

export default function DarkSelect({ value, onChange, options, className = '' }: DarkSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-2 px-2.5 py-1.5 bg-[#111] border rounded-lg text-xs text-white focus:outline-none transition-all whitespace-nowrap ${
          open ? 'border-violet-500' : 'border-white/10 hover:border-white/20'
        }`}
      >
        <span>{selected?.label}</span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div className="absolute z-50 mt-1 min-w-full bg-[#111] border border-white/10 rounded-lg shadow-xl overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors whitespace-nowrap ${
                opt.value === value
                  ? 'bg-violet-600/20 text-violet-300'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
