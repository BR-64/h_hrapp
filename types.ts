export enum LocationType {
  WFH = 'WFH',
  OFFICE_HANDSE = 'Office (HAND SE)',
  OFFICE_KRAC = 'Office (KRAC)',
  OFFSITE = 'Off-Site'
}

export enum LeaveType {
  SICK = 'Sick Leave',
  ANNUAL = 'Annual Leave',
  PERSONAL = 'Personal Leave',
  COMPENSATION = 'Holiday Compensation',
  MATERNITY_1 = 'Maternity Leave (1st 60 Days)',
  MATERNITY_2 = 'Maternity Leave (2nd 60 Days)',
  TRAINING = 'Training Leave',
  STERILIZATION = 'Sterilization Leave',
  ORDINATION = 'Ordination Leave',
  UNPAID = 'Unpaid Leave',
  CHILD_CARE = 'Child Care Sick Leave'
}

export enum LeaveStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  CANCELLED = 'Cancelled'
}

export enum LeaveDuration {
  FULL_DAY = 'Full Day',
  HALF_DAY_AM = 'Half Day (AM)',
  HALF_DAY_PM = 'Half Day (PM)'
}

export type UserRole = 'Employee' | 'Manager' | 'Admin';

export type LeaveBalance = {
  [key in LeaveType]: number;
};

export interface Employee {
  id: string;
  name: string;           // Legacy display name
  nameTh?: string;        // ชื่อจริง (ภาษาไทย)
  nameEn?: string;        // Full Name (English)
  nicknameTh?: string;    // ชื่อเล่น (ภาษาไทย)
  nicknameEn?: string;    // Nickname (English)
  // Fix: Added missing nickname property to support legacy display logic and mock data
  nickname?: string;      // General display nickname
  phone?: string;         // เบอร์โทร
  email?: string;         // E-mail (Primary)
  additionalEmails?: string[]; // Multiple emails support
  password?: string;      // Password for login
  baseLocation?: string;  // Location
  department: string;
  position: string;
  role: UserRole;
  avatar?: string;
  managerId?: string;
  balances?: LeaveBalance;
}

export interface WorkLog {
  id: string;
  employeeId: string;
  date: string; // ISO format YYYY-MM-DD
  type: LocationType;
  timestamp: string; // Full ISO timestamp
  note?: string;
  startTime?: string; // Format HH:mm
  endTime?: string;   // Format HH:mm
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  duration: LeaveDuration;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  timestamp: string;
  attachmentName?: string;
  attachmentData?: string; 
  ccTo?: string[];
  remarks?: string;
}

export interface DashboardStats {
  totalWFH: number;
  totalOffice: number;
  totalOffSite: number;
  totalPending: number;
}

// Added missing CompanyHoliday interface
export interface CompanyHoliday {
  id: string;
  date: string;
  name: string;
}

// Fix: Add missing Notification interface to support the notifications system in App.tsx
export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'checkin' | 'leave';
  tabLink?: 'home' | 'dashboard' | 'leave' | 'admin' | 'profile';
}
