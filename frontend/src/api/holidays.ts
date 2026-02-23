import { apiRequest } from './client';
import { CompanyHoliday } from '../types';

export const getAll = (): Promise<CompanyHoliday[]> =>
  apiRequest<CompanyHoliday[]>('/holidays');

export const create = (h: { date: string; name: string }): Promise<CompanyHoliday> =>
  apiRequest<CompanyHoliday>('/holidays', {
    method: 'POST',
    body: JSON.stringify(h),
  });

export const remove = (id: string): Promise<void> =>
  apiRequest<void>(`/holidays/${id}`, { method: 'DELETE' });

export const fetchFromAI = (): Promise<{ added: number; holidays: CompanyHoliday[] }> =>
  apiRequest<{ added: number; holidays: CompanyHoliday[] }>('/holidays/fetch-ai', {
    method: 'POST',
  });
