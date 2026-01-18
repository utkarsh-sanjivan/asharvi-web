import { API_BASE, env } from '@/config/env';

export const resolveApiUrl = (path: string): string => {
  if (API_BASE.startsWith('/')) {
    return `${env.NEXT_PUBLIC_SITE_URL}${API_BASE}${path}`;
  }

  return `${API_BASE}${path}`;
};
