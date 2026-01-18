const STORAGE_KEY = 'asharvi_staging_purchases';

const normalizeCourseId = (courseId: string) => courseId.trim().toLowerCase();

const readStoredIds = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

export const isStagingPurchaseMarked = (courseId: string): boolean => {
  const normalized = normalizeCourseId(courseId);
  return readStoredIds().some((stored) => normalizeCourseId(String(stored)) === normalized);
};

export const markStagingPurchase = (courseId: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalized = normalizeCourseId(courseId);
  const next = new Set(readStoredIds().map((id) => normalizeCourseId(String(id))));
  next.add(normalized);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
};
