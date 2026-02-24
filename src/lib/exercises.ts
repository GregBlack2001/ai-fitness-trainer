// Comprehensive Exercise Database for AI-Powered Fitness Trainer
// Used to provide structured exercise data to AI for better workout generation

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quadriceps"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "forearms"
  | "full_body";

export type Equipment =
  | "none"
  | "dumbbells"
  | "barbell"
  | "kettlebell"
  | "cables"
  | "machine"
  | "bench"
  | "pull_up_bar"
  | "resistance_bands"
  | "ez_bar"
  | "medicine_ball"
  | "stability_ball"
  | "trx";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export type ExerciseType = "compound" | "isolation" | "cardio" | "flexibility";

export interface Exercise {
  name: string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: Equipment[];
  level: DifficultyLevel;
  type: ExerciseType;
  repRangeStrength: [number, number]; // e.g., [3, 6]
  repRangeHypertrophy: [number, number]; // e.g., [8, 12]
  repRangeEndurance: [number, number]; // e.g., [15, 20]
  restSecondsStrength: number;
  restSecondsHypertrophy: number;
  restSecondsEndurance: number;
  notes?: string;
  alternatives?: string[];
  contraindications?: string[]; // Injuries this exercise is bad for
}

export const EXERCISE_DATABASE: Exercise[] = [
  // === CHEST ===
  {
    name: "Barbell Bench Press",
    primary: "chest",
    secondary: ["triceps", "shoulders"],
    equipment: ["barbell", "bench"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [3, 6],
    repRangeHypertrophy: [8, 12],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 180,
    restSecondsHypertrophy: 90,
    restSecondsEndurance: 45,
    alternatives: ["Dumbbell Bench Press", "Push-ups"],
    contraindications: ["shoulder injury", "rotator cuff"],
  },
  {
    name: "Dumbbell Bench Press",
    primary: "chest",
    secondary: ["triceps", "shoulders"],
    equipment: ["dumbbells", "bench"],
    level: "beginner",
    type: "compound",
    repRangeStrength: [4, 6],
    repRangeHypertrophy: [8, 12],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 150,
    restSecondsHypertrophy: 75,
    restSecondsEndurance: 45,
    alternatives: ["Barbell Bench Press", "Push-ups"],
    contraindications: ["shoulder injury"],
  },
  {
    name: "Incline Dumbbell Press",
    primary: "chest",
    secondary: ["shoulders", "triceps"],
    equipment: ["dumbbells", "bench"],
    level: "beginner",
    type: "compound",
    repRangeStrength: [4, 6],
    repRangeHypertrophy: [8, 12],
    repRangeEndurance: [12, 15],
    restSecondsStrength: 150,
    restSecondsHypertrophy: 75,
    restSecondsEndurance: 45,
    alternatives: ["Incline Barbell Press", "Low-to-High Cable Fly"],
    contraindications: ["shoulder injury"],
  },
  {
    name: "Push-ups",
    primary: "chest",
    secondary: ["triceps", "shoulders", "core"],
    equipment: ["none"],
    level: "beginner",
    type: "compound",
    repRangeStrength: [5, 10],
    repRangeHypertrophy: [10, 20],
    repRangeEndurance: [20, 40],
    restSecondsStrength: 120,
    restSecondsHypertrophy: 60,
    restSecondsEndurance: 30,
    alternatives: ["Bench Press", "Dumbbell Press"],
    contraindications: ["wrist injury"],
  },
  {
    name: "Dumbbell Fly",
    primary: "chest",
    secondary: [],
    equipment: ["dumbbells", "bench"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [10, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 90,
    restSecondsHypertrophy: 60,
    restSecondsEndurance: 30,
    alternatives: ["Cable Fly", "Pec Deck"],
    contraindications: ["shoulder injury"],
  },
  {
    name: "Cable Fly",
    primary: "chest",
    secondary: [],
    equipment: ["cables"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [8, 10],
    repRangeHypertrophy: [12, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 90,
    restSecondsHypertrophy: 60,
    restSecondsEndurance: 30,
    alternatives: ["Dumbbell Fly", "Pec Deck"],
    contraindications: ["shoulder injury"],
  },
  {
    name: "Dips (Chest)",
    primary: "chest",
    secondary: ["triceps", "shoulders"],
    equipment: ["none"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [5, 8],
    repRangeHypertrophy: [8, 12],
    repRangeEndurance: [12, 20],
    restSecondsStrength: 150,
    restSecondsHypertrophy: 90,
    restSecondsEndurance: 45,
    notes: "Lean forward to target chest",
    alternatives: ["Decline Push-ups", "Decline Bench Press"],
    contraindications: ["shoulder injury", "elbow injury"],
  },

  // === BACK ===
  {
    name: "Barbell Row",
    primary: "back",
    secondary: ["biceps", "core"],
    equipment: ["barbell"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [4, 6],
    repRangeHypertrophy: [8, 12],
    repRangeEndurance: [12, 15],
    restSecondsStrength: 150,
    restSecondsHypertrophy: 90,
    restSecondsEndurance: 45,
    alternatives: ["Dumbbell Row", "Cable Row"],
    contraindications: ["lower back injury"],
  },
  {
    name: "Dumbbell Row",
    primary: "back",
    secondary: ["biceps"],
    equipment: ["dumbbells", "bench"],
    level: "beginner",
    type: "compound",
    repRangeStrength: [5, 8],
    repRangeHypertrophy: [8, 12],
    repRangeEndurance: [12, 15],
    restSecondsStrength: 120,
    restSecondsHypertrophy: 75,
    restSecondsEndurance: 45,
    alternatives: ["Barbell Row", "Cable Row"],
    contraindications: [],
  },
  {
    name: "Pull-ups",
    primary: "back",
    secondary: ["biceps", "core"],
    equipment: ["pull_up_bar"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [3, 6],
    repRangeHypertrophy: [6, 12],
    repRangeEndurance: [12, 20],
    restSecondsStrength: 180,
    restSecondsHypertrophy: 90,
    restSecondsEndurance: 60,
    alternatives: ["Lat Pulldown", "Assisted Pull-ups"],
    contraindications: ["shoulder injury", "elbow injury"],
  },
  {
    name: "Lat Pulldown",
    primary: "back",
    secondary: ["biceps"],
    equipment: ["cables", "machine"],
    level: "beginner",
    type: "compound",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [10, 12],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 120,
    restSecondsHypertrophy: 75,
    restSecondsEndurance: 45,
    alternatives: ["Pull-ups", "Resistance Band Pulldown"],
    contraindications: [],
  },
  {
    name: "Seated Cable Row",
    primary: "back",
    secondary: ["biceps"],
    equipment: ["cables"],
    level: "beginner",
    type: "compound",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [10, 12],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 120,
    restSecondsHypertrophy: 75,
    restSecondsEndurance: 45,
    alternatives: ["Dumbbell Row", "Barbell Row"],
    contraindications: [],
  },
  {
    name: "Deadlift",
    primary: "back",
    secondary: ["hamstrings", "glutes", "core"],
    equipment: ["barbell"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [3, 5],
    repRangeHypertrophy: [6, 10],
    repRangeEndurance: [10, 15],
    restSecondsStrength: 240,
    restSecondsHypertrophy: 120,
    restSecondsEndurance: 90,
    alternatives: ["Romanian Deadlift", "Trap Bar Deadlift"],
    contraindications: ["lower back injury", "herniated disc"],
  },
  {
    name: "Face Pulls",
    primary: "back",
    secondary: ["shoulders"],
    equipment: ["cables"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [10, 12],
    repRangeHypertrophy: [15, 20],
    repRangeEndurance: [20, 25],
    restSecondsStrength: 60,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    notes: "Great for posture and shoulder health",
    alternatives: ["Band Pull-aparts", "Reverse Fly"],
    contraindications: [],
  },

  // === SHOULDERS ===
  {
    name: "Overhead Press",
    primary: "shoulders",
    secondary: ["triceps", "core"],
    equipment: ["barbell"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [3, 6],
    repRangeHypertrophy: [8, 12],
    repRangeEndurance: [12, 15],
    restSecondsStrength: 180,
    restSecondsHypertrophy: 90,
    restSecondsEndurance: 60,
    alternatives: ["Dumbbell Shoulder Press", "Arnold Press"],
    contraindications: ["shoulder injury", "neck injury"],
  },
  {
    name: "Dumbbell Shoulder Press",
    primary: "shoulders",
    secondary: ["triceps"],
    equipment: ["dumbbells"],
    level: "beginner",
    type: "compound",
    repRangeStrength: [5, 8],
    repRangeHypertrophy: [8, 12],
    repRangeEndurance: [12, 15],
    restSecondsStrength: 150,
    restSecondsHypertrophy: 75,
    restSecondsEndurance: 45,
    alternatives: ["Overhead Press", "Machine Shoulder Press"],
    contraindications: ["shoulder injury"],
  },
  {
    name: "Lateral Raises",
    primary: "shoulders",
    secondary: [],
    equipment: ["dumbbells"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [8, 10],
    repRangeHypertrophy: [12, 15],
    repRangeEndurance: [15, 25],
    restSecondsStrength: 75,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    alternatives: ["Cable Lateral Raise", "Machine Lateral Raise"],
    contraindications: ["shoulder impingement"],
  },
  {
    name: "Front Raises",
    primary: "shoulders",
    secondary: [],
    equipment: ["dumbbells"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [8, 10],
    repRangeHypertrophy: [12, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 60,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    alternatives: ["Cable Front Raise", "Plate Front Raise"],
    contraindications: ["shoulder injury"],
  },
  {
    name: "Reverse Fly",
    primary: "shoulders",
    secondary: ["back"],
    equipment: ["dumbbells"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [10, 12],
    repRangeHypertrophy: [12, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 60,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    alternatives: ["Face Pulls", "Cable Reverse Fly"],
    contraindications: [],
  },
  {
    name: "Arnold Press",
    primary: "shoulders",
    secondary: ["triceps"],
    equipment: ["dumbbells"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [8, 12],
    repRangeEndurance: [12, 15],
    restSecondsStrength: 120,
    restSecondsHypertrophy: 75,
    restSecondsEndurance: 45,
    alternatives: ["Dumbbell Shoulder Press", "Overhead Press"],
    contraindications: ["shoulder injury"],
  },

  // === BICEPS ===
  {
    name: "Barbell Curl",
    primary: "biceps",
    secondary: ["forearms"],
    equipment: ["barbell"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [10, 12],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 90,
    restSecondsHypertrophy: 60,
    restSecondsEndurance: 30,
    alternatives: ["EZ Bar Curl", "Dumbbell Curl"],
    contraindications: ["elbow injury", "wrist injury"],
  },
  {
    name: "Dumbbell Curl",
    primary: "biceps",
    secondary: ["forearms"],
    equipment: ["dumbbells"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [10, 12],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 75,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    alternatives: ["Barbell Curl", "Cable Curl"],
    contraindications: ["elbow injury"],
  },
  {
    name: "Hammer Curl",
    primary: "biceps",
    secondary: ["forearms"],
    equipment: ["dumbbells"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [10, 12],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 75,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    notes: "Targets brachialis for arm thickness",
    alternatives: ["Cable Rope Curl", "Cross-body Curl"],
    contraindications: [],
  },
  {
    name: "Incline Dumbbell Curl",
    primary: "biceps",
    secondary: [],
    equipment: ["dumbbells", "bench"],
    level: "intermediate",
    type: "isolation",
    repRangeStrength: [8, 10],
    repRangeHypertrophy: [10, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 75,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    notes: "Great stretch at bottom position",
    alternatives: ["Dumbbell Curl", "Preacher Curl"],
    contraindications: ["shoulder injury"],
  },
  {
    name: "Preacher Curl",
    primary: "biceps",
    secondary: [],
    equipment: ["ez_bar", "bench"],
    level: "intermediate",
    type: "isolation",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [10, 12],
    repRangeEndurance: [12, 15],
    restSecondsStrength: 90,
    restSecondsHypertrophy: 60,
    restSecondsEndurance: 30,
    alternatives: ["Machine Preacher Curl", "Concentration Curl"],
    contraindications: ["elbow injury"],
  },

  // === TRICEPS ===
  {
    name: "Tricep Pushdown",
    primary: "triceps",
    secondary: [],
    equipment: ["cables"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [8, 10],
    repRangeHypertrophy: [12, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 75,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    alternatives: ["Rope Pushdown", "Overhead Tricep Extension"],
    contraindications: ["elbow injury"],
  },
  {
    name: "Overhead Tricep Extension",
    primary: "triceps",
    secondary: [],
    equipment: ["dumbbells"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [8, 10],
    repRangeHypertrophy: [10, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 75,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    alternatives: ["Cable Overhead Extension", "Skull Crushers"],
    contraindications: ["shoulder injury", "elbow injury"],
  },
  {
    name: "Skull Crushers",
    primary: "triceps",
    secondary: [],
    equipment: ["ez_bar", "bench"],
    level: "intermediate",
    type: "isolation",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [10, 12],
    repRangeEndurance: [12, 15],
    restSecondsStrength: 90,
    restSecondsHypertrophy: 60,
    restSecondsEndurance: 30,
    alternatives: ["Dumbbell Skull Crushers", "Tricep Pushdown"],
    contraindications: ["elbow injury"],
  },
  {
    name: "Close-Grip Bench Press",
    primary: "triceps",
    secondary: ["chest", "shoulders"],
    equipment: ["barbell", "bench"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [4, 6],
    repRangeHypertrophy: [8, 12],
    repRangeEndurance: [12, 15],
    restSecondsStrength: 150,
    restSecondsHypertrophy: 90,
    restSecondsEndurance: 45,
    alternatives: ["Diamond Push-ups", "Tricep Dips"],
    contraindications: ["wrist injury", "shoulder injury"],
  },
  {
    name: "Tricep Dips",
    primary: "triceps",
    secondary: ["chest", "shoulders"],
    equipment: ["none"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [8, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 120,
    restSecondsHypertrophy: 75,
    restSecondsEndurance: 45,
    notes: "Stay upright to target triceps more",
    alternatives: ["Bench Dips", "Close-Grip Bench Press"],
    contraindications: ["shoulder injury", "elbow injury"],
  },

  // === QUADRICEPS ===
  {
    name: "Barbell Back Squat",
    primary: "quadriceps",
    secondary: ["glutes", "hamstrings", "core"],
    equipment: ["barbell"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [3, 5],
    repRangeHypertrophy: [8, 12],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 240,
    restSecondsHypertrophy: 120,
    restSecondsEndurance: 60,
    alternatives: ["Goblet Squat", "Leg Press"],
    contraindications: ["knee injury", "lower back injury"],
  },
  {
    name: "Goblet Squat",
    primary: "quadriceps",
    secondary: ["glutes", "core"],
    equipment: ["dumbbells", "kettlebell"],
    level: "beginner",
    type: "compound",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [10, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 120,
    restSecondsHypertrophy: 75,
    restSecondsEndurance: 45,
    alternatives: ["Bodyweight Squat", "Dumbbell Squat"],
    contraindications: ["knee injury"],
  },
  {
    name: "Leg Press",
    primary: "quadriceps",
    secondary: ["glutes", "hamstrings"],
    equipment: ["machine"],
    level: "beginner",
    type: "compound",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [10, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 150,
    restSecondsHypertrophy: 90,
    restSecondsEndurance: 45,
    alternatives: ["Squat", "Hack Squat"],
    contraindications: ["knee injury"],
  },
  {
    name: "Leg Extension",
    primary: "quadriceps",
    secondary: [],
    equipment: ["machine"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [8, 10],
    repRangeHypertrophy: [12, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 75,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    alternatives: ["Sissy Squat", "Single-leg Extension"],
    contraindications: ["knee injury"],
  },
  {
    name: "Lunges",
    primary: "quadriceps",
    secondary: ["glutes", "hamstrings"],
    equipment: ["none", "dumbbells"],
    level: "beginner",
    type: "compound",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [10, 12],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 120,
    restSecondsHypertrophy: 60,
    restSecondsEndurance: 45,
    notes: "Per leg",
    alternatives: ["Walking Lunges", "Bulgarian Split Squat"],
    contraindications: ["knee injury", "ankle injury"],
  },
  {
    name: "Bulgarian Split Squat",
    primary: "quadriceps",
    secondary: ["glutes", "hamstrings"],
    equipment: ["dumbbells", "bench"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [8, 12],
    repRangeEndurance: [12, 15],
    restSecondsStrength: 120,
    restSecondsHypertrophy: 75,
    restSecondsEndurance: 45,
    notes: "Per leg - great for unilateral strength",
    alternatives: ["Lunges", "Step-ups"],
    contraindications: ["knee injury", "ankle injury"],
  },

  // === HAMSTRINGS ===
  {
    name: "Romanian Deadlift",
    primary: "hamstrings",
    secondary: ["glutes", "back"],
    equipment: ["barbell", "dumbbells"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [5, 8],
    repRangeHypertrophy: [8, 12],
    repRangeEndurance: [12, 15],
    restSecondsStrength: 150,
    restSecondsHypertrophy: 90,
    restSecondsEndurance: 60,
    alternatives: ["Stiff-Leg Deadlift", "Good Mornings"],
    contraindications: ["lower back injury"],
  },
  {
    name: "Leg Curl",
    primary: "hamstrings",
    secondary: [],
    equipment: ["machine"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [8, 10],
    repRangeHypertrophy: [10, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 75,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    alternatives: ["Nordic Curl", "Stability Ball Leg Curl"],
    contraindications: ["knee injury"],
  },
  {
    name: "Good Mornings",
    primary: "hamstrings",
    secondary: ["glutes", "back"],
    equipment: ["barbell"],
    level: "advanced",
    type: "compound",
    repRangeStrength: [5, 8],
    repRangeHypertrophy: [8, 12],
    repRangeEndurance: [12, 15],
    restSecondsStrength: 150,
    restSecondsHypertrophy: 90,
    restSecondsEndurance: 60,
    alternatives: ["Romanian Deadlift", "Hyperextensions"],
    contraindications: ["lower back injury"],
  },

  // === GLUTES ===
  {
    name: "Hip Thrust",
    primary: "glutes",
    secondary: ["hamstrings"],
    equipment: ["barbell", "bench"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [5, 8],
    repRangeHypertrophy: [8, 12],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 120,
    restSecondsHypertrophy: 75,
    restSecondsEndurance: 45,
    alternatives: ["Glute Bridge", "Cable Pull-through"],
    contraindications: ["lower back injury"],
  },
  {
    name: "Glute Bridge",
    primary: "glutes",
    secondary: ["hamstrings"],
    equipment: ["none", "dumbbells"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [8, 10],
    repRangeHypertrophy: [12, 15],
    repRangeEndurance: [20, 30],
    restSecondsStrength: 75,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    alternatives: ["Hip Thrust", "Single-leg Glute Bridge"],
    contraindications: [],
  },
  {
    name: "Cable Kickback",
    primary: "glutes",
    secondary: [],
    equipment: ["cables"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [10, 12],
    repRangeHypertrophy: [12, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 60,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    notes: "Per leg",
    alternatives: ["Donkey Kicks", "Hip Thrust"],
    contraindications: [],
  },

  // === CALVES ===
  {
    name: "Standing Calf Raise",
    primary: "calves",
    secondary: [],
    equipment: ["machine", "dumbbells"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [8, 10],
    repRangeHypertrophy: [12, 15],
    repRangeEndurance: [20, 30],
    restSecondsStrength: 60,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    alternatives: ["Leg Press Calf Raise", "Single-leg Calf Raise"],
    contraindications: ["ankle injury", "achilles injury"],
  },
  {
    name: "Seated Calf Raise",
    primary: "calves",
    secondary: [],
    equipment: ["machine"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [10, 12],
    repRangeHypertrophy: [15, 20],
    repRangeEndurance: [20, 30],
    restSecondsStrength: 60,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    notes: "Targets soleus",
    alternatives: ["Standing Calf Raise"],
    contraindications: ["ankle injury"],
  },

  // === CORE ===
  {
    name: "Plank",
    primary: "core",
    secondary: ["shoulders"],
    equipment: ["none"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [1, 1], // Time-based
    repRangeHypertrophy: [1, 1],
    repRangeEndurance: [1, 1],
    restSecondsStrength: 60,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    notes: "Hold for 30-60 seconds",
    alternatives: ["Side Plank", "Dead Bug"],
    contraindications: ["shoulder injury", "wrist injury"],
  },
  {
    name: "Hanging Leg Raise",
    primary: "core",
    secondary: ["forearms"],
    equipment: ["pull_up_bar"],
    level: "intermediate",
    type: "isolation",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [10, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 90,
    restSecondsHypertrophy: 60,
    restSecondsEndurance: 30,
    alternatives: ["Lying Leg Raise", "Captain's Chair Leg Raise"],
    contraindications: ["lower back injury", "shoulder injury"],
  },
  {
    name: "Cable Crunch",
    primary: "core",
    secondary: [],
    equipment: ["cables"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [10, 12],
    repRangeHypertrophy: [15, 20],
    repRangeEndurance: [20, 30],
    restSecondsStrength: 60,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    alternatives: ["Weighted Crunch", "Ab Wheel"],
    contraindications: ["neck injury"],
  },
  {
    name: "Russian Twist",
    primary: "core",
    secondary: [],
    equipment: ["none", "medicine_ball"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [10, 12],
    repRangeHypertrophy: [15, 20],
    repRangeEndurance: [20, 30],
    restSecondsStrength: 60,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    notes: "Per side",
    alternatives: ["Woodchop", "Bicycle Crunch"],
    contraindications: ["lower back injury"],
  },
  {
    name: "Ab Wheel Rollout",
    primary: "core",
    secondary: ["shoulders"],
    equipment: ["none"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [6, 8],
    repRangeHypertrophy: [10, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 90,
    restSecondsHypertrophy: 60,
    restSecondsEndurance: 30,
    alternatives: ["Plank", "Dead Bug"],
    contraindications: ["lower back injury", "shoulder injury"],
  },
  {
    name: "Dead Bug",
    primary: "core",
    secondary: [],
    equipment: ["none"],
    level: "beginner",
    type: "isolation",
    repRangeStrength: [8, 10],
    repRangeHypertrophy: [12, 15],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 60,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 30,
    notes: "Great for core stability",
    alternatives: ["Bird Dog", "Plank"],
    contraindications: [],
  },

  // === FULL BODY / CARDIO ===
  {
    name: "Burpees",
    primary: "full_body",
    secondary: ["chest", "quadriceps", "core"],
    equipment: ["none"],
    level: "intermediate",
    type: "cardio",
    repRangeStrength: [5, 8],
    repRangeHypertrophy: [10, 15],
    repRangeEndurance: [15, 30],
    restSecondsStrength: 90,
    restSecondsHypertrophy: 60,
    restSecondsEndurance: 30,
    alternatives: ["Mountain Climbers", "Squat Jumps"],
    contraindications: ["wrist injury", "knee injury", "shoulder injury"],
  },
  {
    name: "Kettlebell Swing",
    primary: "full_body",
    secondary: ["glutes", "hamstrings", "core", "shoulders"],
    equipment: ["kettlebell"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [8, 10],
    repRangeHypertrophy: [15, 20],
    repRangeEndurance: [20, 30],
    restSecondsStrength: 90,
    restSecondsHypertrophy: 60,
    restSecondsEndurance: 30,
    alternatives: ["Dumbbell Swing", "Hip Thrust"],
    contraindications: ["lower back injury"],
  },
  {
    name: "Mountain Climbers",
    primary: "full_body",
    secondary: ["core", "shoulders", "quadriceps"],
    equipment: ["none"],
    level: "beginner",
    type: "cardio",
    repRangeStrength: [15, 20],
    repRangeHypertrophy: [20, 30],
    repRangeEndurance: [30, 50],
    restSecondsStrength: 60,
    restSecondsHypertrophy: 45,
    restSecondsEndurance: 20,
    notes: "Per leg",
    alternatives: ["Burpees", "High Knees"],
    contraindications: ["wrist injury"],
  },
  {
    name: "Thrusters",
    primary: "full_body",
    secondary: ["quadriceps", "shoulders", "core"],
    equipment: ["dumbbells", "barbell"],
    level: "intermediate",
    type: "compound",
    repRangeStrength: [5, 8],
    repRangeHypertrophy: [10, 12],
    repRangeEndurance: [15, 20],
    restSecondsStrength: 120,
    restSecondsHypertrophy: 75,
    restSecondsEndurance: 45,
    alternatives: ["Squat to Press", "Wall Ball"],
    contraindications: ["knee injury", "shoulder injury"],
  },
];

// Helper functions
export function getExercisesByMuscle(muscle: MuscleGroup): Exercise[] {
  return EXERCISE_DATABASE.filter((e) => e.primary === muscle);
}

export function getExercisesByEquipment(equipment: Equipment[]): Exercise[] {
  return EXERCISE_DATABASE.filter((e) =>
    e.equipment.some((eq) => equipment.includes(eq) || eq === "none"),
  );
}

export function getExercisesByLevel(level: DifficultyLevel): Exercise[] {
  const levelOrder = { beginner: 0, intermediate: 1, advanced: 2 };
  return EXERCISE_DATABASE.filter(
    (e) => levelOrder[e.level] <= levelOrder[level],
  );
}

export function getSafeExercises(injuries: string[]): Exercise[] {
  const lowerInjuries = injuries.map((i) => i.toLowerCase());
  return EXERCISE_DATABASE.filter(
    (e) =>
      !e.contraindications?.some((c) =>
        lowerInjuries.some(
          (injury) => injury.includes(c) || c.includes(injury),
        ),
      ),
  );
}

export function getExerciseAlternatives(exerciseName: string): string[] {
  const exercise = EXERCISE_DATABASE.find(
    (e) => e.name.toLowerCase() === exerciseName.toLowerCase(),
  );
  return exercise?.alternatives || [];
}

// Get rep range and rest based on goal
export function getExerciseParams(
  exercise: Exercise,
  goal: string,
): { reps: [number, number]; rest: number } {
  const goalLower = goal.toLowerCase();

  if (
    goalLower.includes("strength") ||
    goalLower.includes("strong") ||
    goalLower.includes("power")
  ) {
    return {
      reps: exercise.repRangeStrength,
      rest: exercise.restSecondsStrength,
    };
  }
  if (
    goalLower.includes("endurance") ||
    goalLower.includes("tone") ||
    goalLower.includes("lean")
  ) {
    return {
      reps: exercise.repRangeEndurance,
      rest: exercise.restSecondsEndurance,
    };
  }
  // Default to hypertrophy for muscle building, general fitness
  return {
    reps: exercise.repRangeHypertrophy,
    rest: exercise.restSecondsHypertrophy,
  };
}

// Generate exercise context string for AI prompts
export function generateExerciseContext(
  equipment: string[],
  injuries: string[],
  level: DifficultyLevel,
  goal: string,
): string {
  const equipmentList = equipment.map((e) =>
    e.toLowerCase().replace(/[^a-z_]/g, "_"),
  ) as Equipment[];

  // Get suitable exercises
  let exercises = EXERCISE_DATABASE;

  // Filter by equipment
  if (
    equipmentList.length > 0 &&
    !equipmentList.includes("none" as Equipment)
  ) {
    exercises = exercises.filter((e) =>
      e.equipment.some((eq) => equipmentList.includes(eq) || eq === "none"),
    );
  }

  // Filter by level
  const levelOrder = { beginner: 0, intermediate: 1, advanced: 2 };
  exercises = exercises.filter((e) => levelOrder[e.level] <= levelOrder[level]);

  // Filter out contraindicated exercises
  if (injuries.length > 0) {
    const lowerInjuries = injuries.map((i) => i.toLowerCase());
    exercises = exercises.filter(
      (e) =>
        !e.contraindications?.some((c) =>
          lowerInjuries.some(
            (injury) => injury.includes(c) || c.includes(injury),
          ),
        ),
    );
  }

  // Group by muscle
  const byMuscle: Record<string, Exercise[]> = {};
  exercises.forEach((e) => {
    if (!byMuscle[e.primary]) byMuscle[e.primary] = [];
    byMuscle[e.primary].push(e);
  });

  // Generate context string
  let context = "AVAILABLE EXERCISES (use only from this list):\n\n";

  for (const [muscle, exList] of Object.entries(byMuscle)) {
    context += `${muscle.toUpperCase()}:\n`;
    exList.forEach((e) => {
      const params = getExerciseParams(e, goal);
      context += `- ${e.name} [${e.type}]: ${params.reps[0]}-${params.reps[1]} reps, ${params.rest}s rest`;
      if (e.notes) context += ` (${e.notes})`;
      context += "\n";
    });
    context += "\n";
  }

  return context;
}
