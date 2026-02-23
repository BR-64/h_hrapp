import { apiRequest } from './client';

export const getDepartments = (): Promise<string[]> =>
  apiRequest<string[]>('/settings/departments');

export const getPositions = (): Promise<string[]> =>
  apiRequest<string[]>('/settings/positions');

export const updateDepartments = (departments: string[]): Promise<string[]> =>
  apiRequest<string[]>('/settings/departments', {
    method: 'PUT',
    body: JSON.stringify({ departments }),
  });

export const updatePositions = (positions: string[]): Promise<string[]> =>
  apiRequest<string[]>('/settings/positions', {
    method: 'PUT',
    body: JSON.stringify({ positions }),
  });
