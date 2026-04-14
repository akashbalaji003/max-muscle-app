-- ============================================================
-- MIGRATION 001 — Improvements
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- 1. Add duration + type to workouts
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS duration_seconds INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS workout_type VARCHAR(20) DEFAULT 'custom';
  -- workout_type values: 'push' | 'pull' | 'legs' | 'custom'

-- 2. Add muscle_group + equipment to exercises
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS muscle_group VARCHAR(60),
  ADD COLUMN IF NOT EXISTS equipment   VARCHAR(60);

-- 3. Rename note → caption in progress_photos (keep note as alias)
ALTER TABLE progress_photos
  ADD COLUMN IF NOT EXISTS caption TEXT;

-- Copy existing note data to caption
UPDATE progress_photos SET caption = note WHERE note IS NOT NULL AND caption IS NULL;

-- ============================================================
-- Re-seed exercises with full muscle + equipment data
-- ============================================================
TRUNCATE TABLE exercises CASCADE;  -- resets all exercises + PRs + workout_entries
-- NOTE: This clears PRs/entries too. Safe for fresh install only.

INSERT INTO exercises (name, category, muscle_group, equipment) VALUES
  -- CHEST
  ('Bench Press',            'chest', 'Pectorals, Triceps, Front Delts', 'Barbell + Bench'),
  ('Incline Bench Press',    'chest', 'Upper Pectorals, Front Delts',    'Barbell + Incline Bench'),
  ('Decline Bench Press',    'chest', 'Lower Pectorals',                  'Barbell + Decline Bench'),
  ('Dumbbell Fly',           'chest', 'Pectorals',                        'Dumbbells + Bench'),
  ('Incline Dumbbell Press', 'chest', 'Upper Pectorals, Front Delts',    'Dumbbells + Incline Bench'),
  ('Cable Crossover',        'chest', 'Pectorals',                        'Cable Machine'),
  ('Pec Deck Fly',           'chest', 'Pectorals',                        'Pec Deck Machine'),
  ('Push-Up',                'chest', 'Pectorals, Triceps',               'Bodyweight'),
  ('Chest Dips',             'chest', 'Lower Pectorals, Triceps',         'Dip Bars'),

  -- BACK
  ('Deadlift',               'back',  'Erector Spinae, Glutes, Hamstrings', 'Barbell'),
  ('Pull-Up',                'back',  'Lats, Biceps, Rear Delts',          'Pull-Up Bar'),
  ('Chin-Up',                'back',  'Lats, Biceps',                      'Pull-Up Bar'),
  ('Barbell Row',            'back',  'Lats, Rhomboids, Biceps',           'Barbell'),
  ('Dumbbell Row',           'back',  'Lats, Rhomboids, Biceps',           'Dumbbell + Bench'),
  ('Lat Pulldown',           'back',  'Lats, Biceps',                      'Cable Machine'),
  ('Seated Cable Row',       'back',  'Lats, Rhomboids, Biceps',           'Cable Machine'),
  ('T-Bar Row',              'back',  'Lats, Rhomboids',                   'T-Bar Machine / Barbell'),
  ('Face Pull',              'back',  'Rear Delts, Rotator Cuff',          'Cable Machine'),
  ('Hyperextension',         'back',  'Erector Spinae, Glutes',            'Back Extension Bench'),

  -- LEGS
  ('Squat',                  'legs',  'Quads, Glutes, Hamstrings',         'Barbell + Squat Rack'),
  ('Front Squat',            'legs',  'Quads, Core',                       'Barbell + Squat Rack'),
  ('Leg Press',              'legs',  'Quads, Glutes, Hamstrings',         'Leg Press Machine'),
  ('Romanian Deadlift',      'legs',  'Hamstrings, Glutes',                'Barbell'),
  ('Leg Curl',               'legs',  'Hamstrings',                        'Leg Curl Machine'),
  ('Leg Extension',          'legs',  'Quadriceps',                        'Leg Extension Machine'),
  ('Calf Raise',             'legs',  'Calves (Gastrocnemius)',             'Calf Raise Machine / Barbell'),
  ('Seated Calf Raise',      'legs',  'Calves (Soleus)',                   'Seated Calf Raise Machine'),
  ('Lunges',                 'legs',  'Quads, Glutes, Hamstrings',         'Dumbbells / Barbell'),
  ('Bulgarian Split Squat',  'legs',  'Quads, Glutes',                     'Dumbbells + Bench'),
  ('Hip Thrust',             'legs',  'Glutes, Hamstrings',                'Barbell + Bench'),
  ('Hack Squat',             'legs',  'Quads, Glutes',                     'Hack Squat Machine'),

  -- SHOULDERS
  ('Overhead Press',         'shoulders', 'Front & Mid Delts, Triceps',   'Barbell'),
  ('Dumbbell Shoulder Press','shoulders', 'Front & Mid Delts, Triceps',   'Dumbbells'),
  ('Arnold Press',           'shoulders', 'All Deltoid Heads',             'Dumbbells'),
  ('Lateral Raise',          'shoulders', 'Medial Deltoids',               'Dumbbells / Cable'),
  ('Front Raise',            'shoulders', 'Front Deltoids',                'Dumbbells / Plate'),
  ('Rear Delt Fly',          'shoulders', 'Rear Deltoids',                 'Dumbbells / Pec Deck'),
  ('Shrugs',                 'shoulders', 'Trapezius',                     'Barbell / Dumbbells'),
  ('Upright Row',            'shoulders', 'Traps, Mid Delts',              'Barbell / Cable'),
  ('Cable Lateral Raise',    'shoulders', 'Medial Deltoids',               'Cable Machine'),

  -- ARMS
  ('Barbell Curl',           'arms',  'Biceps',                            'Barbell'),
  ('Dumbbell Curl',          'arms',  'Biceps',                            'Dumbbells'),
  ('Hammer Curl',            'arms',  'Biceps, Brachialis',                'Dumbbells'),
  ('Preacher Curl',          'arms',  'Biceps',                            'Preacher Bench / EZ Bar'),
  ('Cable Curl',             'arms',  'Biceps',                            'Cable Machine'),
  ('Concentration Curl',     'arms',  'Biceps Peak',                       'Dumbbell'),
  ('Tricep Dips',            'arms',  'Triceps, Chest',                    'Dip Bars'),
  ('Skull Crusher',          'arms',  'Triceps',                           'EZ Bar + Bench'),
  ('Cable Tricep Pushdown',  'arms',  'Triceps',                           'Cable Machine'),
  ('Overhead Tricep Extension','arms','Triceps Long Head',                 'Dumbbell / Cable'),
  ('Close-Grip Bench Press', 'arms',  'Triceps, Chest',                    'Barbell + Bench'),
  ('Tricep Kickback',        'arms',  'Triceps',                           'Dumbbell'),

  -- CORE
  ('Plank',                  'core',  'Transverse Abdominis, Core',        'Bodyweight'),
  ('Crunches',               'core',  'Rectus Abdominis',                  'Bodyweight'),
  ('Leg Raises',             'core',  'Lower Abs, Hip Flexors',            'Pull-Up Bar / Bench'),
  ('Russian Twist',          'core',  'Obliques',                          'Medicine Ball / Plate'),
  ('Ab Wheel Rollout',       'core',  'Entire Core',                       'Ab Wheel'),
  ('Cable Crunch',           'core',  'Rectus Abdominis',                  'Cable Machine'),
  ('Hanging Knee Raise',     'core',  'Lower Abs',                         'Pull-Up Bar'),
  ('Bicycle Crunch',         'core',  'Obliques, Rectus Abdominis',        'Bodyweight'),
  ('Dead Bug',               'core',  'Deep Core Stabilizers',             'Bodyweight'),

  -- CARDIO
  ('Treadmill Run',          'cardio','Cardiovascular System, Legs',       'Treadmill'),
  ('Cycling',                'cardio','Cardiovascular System, Quads',      'Stationary Bike'),
  ('Jump Rope',              'cardio','Cardiovascular System, Calves',     'Jump Rope'),
  ('Rowing Machine',         'cardio','Cardiovascular System, Back, Arms', 'Rowing Machine'),
  ('Stair Climber',          'cardio','Glutes, Quads, Cardiovascular',     'Stair Climber Machine'),
  ('Elliptical',             'cardio','Full Body, Cardiovascular',         'Elliptical Machine'),
  ('Battle Ropes',           'cardio','Arms, Shoulders, Cardiovascular',   'Battle Ropes'),
  ('Box Jump',               'cardio','Quads, Glutes, Explosive Power',    'Plyo Box')
ON CONFLICT (name) DO UPDATE
  SET muscle_group = EXCLUDED.muscle_group,
      equipment    = EXCLUDED.equipment,
      category     = EXCLUDED.category;
