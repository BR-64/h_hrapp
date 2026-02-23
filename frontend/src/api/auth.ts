import { apiRequest, setToken, clearToken } from './client';
import { Employee } from '../types';

export interface AuthResponse {
  token: string;
  user: Employee;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(result.token);
  return result;
}

export async function register(data: {
  name: string;
  email: string;
  password: string;
  department: string;
  position: string;
}): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  setToken(result.token);
  return result;
}

export async function getMe(): Promise<Employee> {
  return apiRequest<Employee>('/auth/me');
}

export function logout(): void {
  clearToken();
}
