export type LanguageCode =
  | 'en'
  | 'es'
  | 'it'
  | 'tr'
  | 'ru'
  | 'zh'
  | 'hi'
  | 'pl'
  | 'ko'
  | 'fr';

export type WeightUnit = 'kg' | 'lb';

export type BodyPart =
  | 'back'
  | 'cardio'
  | 'chest'
  | 'lower arms'
  | 'lower legs'
  | 'neck'
  | 'shoulders'
  | 'upper arms'
  | 'upper legs'
  | 'waist';

export interface Exercise {
  id: string;
  name: string;
  name_zh?: string;
  category: string;
  body_part: BodyPart;
  equipment: string;
  instructions: Record<LanguageCode, string[]>;
  instruction_steps?: Record<LanguageCode, string[]>;
  muscle_group: string;
  secondary_muscles: string[];
  target: string;
  media_id: string;
  image: string;
  gif_url: string;
  animation?: string;
  attribution?: string;
  created_at?: string;
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  weight: number;
  reps: number;
  completed: boolean;
  note?: string;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  name: string;
  date: string; // ISO timestamp
  duration: number; // seconds
  exercises: WorkoutExercise[];
  note?: string;
}

export interface AppSettings {
  language: LanguageCode;
  theme: 'light' | 'dark' | 'system';
  units: 'kg' | 'lb';
  restTimer?: number; // legacy alias
  defaultRestSeconds: number;
  restTimerEnabled: boolean;
  autoRest: boolean;
  saveHistory: boolean;
  hapticFeedback: boolean;
}

export type FilterMode = 'body_part' | 'equipment' | 'muscle_group';

export interface ExerciseFilters {
  bodyPart?: BodyPart | null;
  equipment?: string | null;
  muscleGroup?: string | null;
  target?: string | null;
  searchQuery?: string | null;
}
