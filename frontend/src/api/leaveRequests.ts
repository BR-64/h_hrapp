import { apiRequest } from './client';
import { LeaveRequest, LeaveStatus } from '../types';

export const getAll = (params?: {
  employeeId?: string;
  status?: string;
}): Promise<LeaveRequest[]> => {
  const qs = params ? new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null)) as Record<string, string>
  ).toString() : '';
  return apiRequest<LeaveRequest[]>(`/leave-requests${qs ? '?' + qs : ''}`);
};

export const create = (req: Partial<LeaveRequest>): Promise<LeaveRequest> =>
  apiRequest<LeaveRequest>('/leave-requests', {
    method: 'POST',
    body: JSON.stringify(req),
  });

export const updateStatus = (
  id: string,
  status: LeaveStatus,
  remarks?: string
): Promise<LeaveRequest> =>
  apiRequest<LeaveRequest>(`/leave-requests/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, remarks }),
  });

export const cancel = (id: string): Promise<LeaveRequest | void> =>
  apiRequest<LeaveRequest | void>(`/leave-requests/${id}`, { method: 'DELETE' });
