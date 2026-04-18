/**
 * Central registry of all gyms on the platform.
 * Add a new entry here when onboarding a new gym.
 * Used by /api/manifest and PWAInstallPrompt.
 */
export interface GymConfig {
  name: string;        // Full display name
  short_name: string;  // Home-screen label (≤12 chars)
  theme_color: string; // Browser chrome / splash accent
  background_color: string;
}

export const GYM_REGISTRY: Record<string, GymConfig> = {
  maxmuscle: {
    name: 'Maximum Muscle Fitness Studio',
    short_name: 'Max Muscle',
    theme_color: '#7C3AED',
    background_color: '#000000',
  },
  // Add more gyms here:
  // gym2: { name: 'Gym Two', short_name: 'Gym 2', theme_color: '#...' background_color: '#...' },
};

export function getGymConfig(gymSlug: string): GymConfig | null {
  return GYM_REGISTRY[gymSlug] ?? null;
}
