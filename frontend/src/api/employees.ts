import { apiRequest } from './client';
import { Employee } from '../types';

export const getAll = (): Promise<Employee[]> =>
  apiRequest<Employee[]>('/employees');

export const getById = (id: string): Promise<Employee> =>
  apiRequest<Employee>(`/employees/${id}`);

export const create = (emp: Partial<Employee> & { password: string }): Promise<Employee> =>
  apiRequest<Employee>('/employees', {
    method: 'POST',
    body: JSON.stringify(emp),
  });

export const update = (id: string, emp: Partial<Employee> & { password?: string }): Promise<Employee> =>
  apiRequest<Employee>(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(emp),
  });

export const remove = (id: string): Promise<void> =>
  apiRequest<void>(`/employees/${id}`, { method: 'DELETE' });
