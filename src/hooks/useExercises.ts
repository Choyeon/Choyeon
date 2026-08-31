import { useEffect, useState, useMemo, useCallback } from 'react';
import type { Exercise, BodyPart, ExerciseFilters } from '@/types';
import {
  getAllExercisesSync,
  countByBodyPart,
  countByEquipment,
  filterExercises,
  findExerciseById,
} from '@/data/queries';

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const data = getAllExercisesSync();
      setExercises(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { exercises, loading };
}

export function useBodyPartCounts() {
  const { exercises } = useExercises();
  return useMemo(() => countByBodyPart(exercises), [exercises]);
}

export function useEquipmentCounts() {
  const { exercises } = useExercises();
  return useMemo(() => countByEquipment(exercises), [exercises]);
}

export function useFilteredExercises(filters: ExerciseFilters) {
  const { exercises, loading } = useExercises();
  const filtered = useMemo(
    () => filterExercises(exercises, filters),
    [exercises, filters]
  );
  return { filtered, loading, total: exercises.length };
}

export function useExerciseById(id: string | undefined) {
  const { exercises, loading } = useExercises();
  const exercise = useMemo(
    () => (id ? findExerciseById(exercises, id) : undefined),
    [exercises, id]
  );
  return { exercise, loading };
}
