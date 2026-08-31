import type { Exercise, BodyPart } from '@/types';

// Lazily import the bundled raw exercise list at runtime
let cachedExercises: Exercise[] | null = null;

export async function loadAllExercises(): Promise<Exercise[]> {
  if (cachedExercises) return cachedExercises;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const raw = require('@/data/exercises.json') as Exercise[];
  cachedExercises = raw;
  return raw;
}

export function getAllExercisesSync(): Exercise[] {
  if (cachedExercises) return cachedExercises;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const raw = require('@/data/exercises.json') as Exercise[];
  cachedExercises = raw;
  return raw;
}

// ============ CATEGORY EXTRACTION ============

export function getUniqueBodyParts(exercises: Exercise[]): BodyPart[] {
  const set = new Set<BodyPart>();
  for (const ex of exercises) set.add(ex.body_part);
  return Array.from(set).sort();
}

export function getUniqueEquipments(exercises: Exercise[]): string[] {
  const set = new Set<string>();
  for (const ex of exercises) set.add(ex.equipment);
  return Array.from(set).sort();
}

export function getUniqueMuscleGroups(exercises: Exercise[]): string[] {
  const set = new Set<string>();
  for (const ex of exercises) {
    set.add(ex.muscle_group);
    for (const m of ex.secondary_muscles) set.add(m);
  }
  return Array.from(set).sort();
}

export function getUniqueTargets(exercises: Exercise[]): string[] {
  const set = new Set<string>();
  for (const ex of exercises) set.add(ex.target);
  return Array.from(set).sort();
}

// ============ FILTERS ============

export interface ExerciseFilters {
  bodyPart?: BodyPart | null;
  equipment?: string | null;
  muscleGroup?: string | null;
  target?: string | null;
  searchQuery?: string | null;
}

export function filterExercises(
  exercises: Exercise[],
  filters: ExerciseFilters
): Exercise[] {
  const { bodyPart, equipment, muscleGroup, target, searchQuery } = filters;

  let result = exercises;

  if (bodyPart) {
    result = result.filter((e) => e.body_part === bodyPart);
  }
  if (equipment) {
    result = result.filter((e) => e.equipment === equipment);
  }
  if (muscleGroup) {
    result = result.filter(
      (e) =>
        e.muscle_group === muscleGroup ||
        e.secondary_muscles.includes(muscleGroup)
    );
  }
  if (target) {
    result = result.filter((e) => e.target === target);
  }
  if (searchQuery && searchQuery.trim().length > 0) {
    const q = searchQuery.toLowerCase().trim();
    const qOrig = searchQuery.trim();
    result = result.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.name_zh ? e.name_zh.includes(qOrig) : false) ||
        e.target.toLowerCase().includes(q) ||
        e.muscle_group.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (Array.isArray(e.instructions.en)
          ? e.instructions.en.some((s: string) => s.toLowerCase().includes(q))
          : String(e.instructions.en || '').toLowerCase().includes(q)) ||
        (Array.isArray(e.instructions.zh)
          ? e.instructions.zh.some((s: string) => s.includes(qOrig))
          : String(e.instructions.zh || '').includes(qOrig))
    );
  }

  return result;
}

// ============ AGGREGATES ============

export interface BodyPartWithCount {
  bodyPart: BodyPart;
  count: number;
}

export function countByBodyPart(
  exercises: Exercise[]
): BodyPartWithCount[] {
  const map = new Map<BodyPart, number>();
  for (const ex of exercises) {
    map.set(ex.body_part, (map.get(ex.body_part) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([bodyPart, count]) => ({ bodyPart, count }))
    .sort((a, b) => b.count - a.count);
}

export interface EquipmentWithCount {
  equipment: string;
  count: number;
}

export function countByEquipment(
  exercises: Exercise[]
): EquipmentWithCount[] {
  const map = new Map<string, number>();
  for (const ex of exercises) {
    map.set(ex.equipment, (map.get(ex.equipment) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([equipment, count]) => ({ equipment, count }))
    .sort((a, b) => b.count - a.count);
}

export function findExerciseById(
  exercises: Exercise[],
  id: string
): Exercise | undefined {
  return exercises.find((e) => e.id === id);
}
