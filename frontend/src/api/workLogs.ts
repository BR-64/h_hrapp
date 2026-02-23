import { apiRequest } from './client';
import { WorkLog, LocationType } from '../types';

export const getAll = (params?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<WorkLog[]> => {
  const qs = params ? new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null)) as Record<string, string>
  ).toString() : '';
  return apiRequest<WorkLog[]>(`/work-logs${qs ? '?' + qs : ''}`);
};

export const create = (log: {
  date: string | string[];
  type: LocationType;
  note?: string;
  customTimestamp?: string;
  startTime?: string;
  endTime?: string;
}): Promise<WorkLog | WorkLog[]> =>
  apiRequest<WorkLog | WorkLog[]>('/work-logs', {
    method: 'POST',
    body: JSON.stringify(log),
  });

export const remove = (id: string): Promise<void> =>
  apiRequest<void>(`/work-logs/${id}`, { method: 'DELETE' });
