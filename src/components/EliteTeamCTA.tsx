'use client';

export default function EliteTeamCTA() {
  const handleStartJourney = () => {
    document.getElementById('call-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFindUs = () => {
    document.getElementById('find-us-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleStartJourney}
        className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-all text-sm active:scale-95"
      >
        Start Your Journey
      </button>
      <button
        onClick={handleFindUs}
        className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold px-4 py-2.5 rounded-lg transition-all text-sm border border-white/20 active:scale-95"
      >
        Find Us
      </button>
    </div>
  );
}
