export interface User {
  id: string;
  phone_number: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  goal?: 'fat_loss' | 'muscle_gain' | 'maintenance' | null;
}

export interface Membership {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  active: boolean;
  created_at: string;
  days_remaining?: number;
}

export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  checked_in_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_group?: string | null;
  equipment?: string | null;
}

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  notes: string | null;
  created_at: string;
  duration_seconds?: number;
  workout_type?: string;
  entries?: WorkoutEntry[];
  workout_entries?: WorkoutEntry[];
}

export interface WorkoutEntry {
  id: string;
  workout_id: string;
  exercise_id: string;
  weight: number;
  reps: number;
  sets: number;
  exercise?: Exercise;
  exercises?: Exercise;
}

export interface PR {
  id: string;
  user_id: string;
  exercise_id: string;
  max_weight: number;
  achieved_at: string;
  exercise?: Exercise;
  exercises?: Exercise;
  user?: Pick<User, 'id' | 'phone_number' | 'name'>;
  users?: Pick<User, 'id' | 'phone_number' | 'name'>;
}

export interface ProgressPhoto {
  id: string;
  user_id: string;
  image_url: string;
  date: string;
  is_weekly: boolean;
  note: string | null;
  caption: string | null;
  created_at: string;
  users?: Pick<User, 'id' | 'phone_number' | 'name'>;
}

export interface JWTPayload {
  userId: string;
  phone: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface WorkoutFormEntry {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  equipment: string;
  weight: string;
  reps: string;
  sets: string;
  completed: boolean;
}

export type WorkoutType = 'push' | 'pull' | 'legs' | 'custom';

export interface AnalyticsData {
  totalWorkouts: number;
  totalVolume: number;
  currentStreak: number;
  longestStreak: number;
  weeklyWorkouts: { date: string; volume: number }[];
  monthlyWorkouts: { week: string; count: number }[];
  bodyPartDistribution: { name: string; value: number }[];
  recentPRs: PR[];
}

// ── New: Intelligent Fitness Layer ────────────────────────────────────────────

export type FitnessGoal = 'fat_loss' | 'muscle_gain' | 'maintenance';

export interface BodyMetrics {
  height_cm: number | null;
  weight_kg: number | null;
  goal: FitnessGoal | null;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  note: string | null;
  logged_at: string;
  created_at: string;
}

export type BadgeType =
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'pr_breaker'
  | 'first_workout'
  | 'century'       // 100 workouts
  | 'iron_will';    // 30-day longest streak

export interface UserBadge {
  type: BadgeType;
  label: string;
  description: string;
  icon: string;       // emoji
  earned: boolean;
  earnedAt?: string;
}

export interface WorkoutRecommendation {
  split: string;
  description: string;
  emphasis: string[];
  note: string;
  bmiCategory: string;
}

export interface CalorieStats {
  today: number;
  week: number;
  month: number;
  allTime: number;
  dailyBreakdown: { date: string; calories: number }[];
}

export interface EnhancedAnalyticsData extends AnalyticsData {
  // Body
  bodyMetrics: BodyMetrics;
  bmi: number | null;
  bmiCategory: string | null;

  // Calories
  calories: CalorieStats;

  // Weight trend
  weightLogs: WeightLog[];

  // Attendance (for calendar)
  attendanceDates: string[];

  // Gamification
  badges: UserBadge[];

  // Recommendations
  recommendation: WorkoutRecommendation | null;
}
