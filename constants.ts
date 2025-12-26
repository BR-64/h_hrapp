import { LocationType, Employee, WorkLog, LeaveType, LeaveBalance, CompanyHoliday } from './types';
import { isWeekend, format } from 'date-fns';

export const DEPARTMENTS = [
  'Executive',
  'Coordination and Corporate Communications',
  'Research & Knowledge Management',
  'Finance & Accounting',
  'Open Data Transparency and Participation'
];

export const POSITIONS = [
  'Advisor',
  'Managing Director',
  'Assistant to Managing Director',
  'General Manager',
  'Project Manager',
  'Head of Good Governance',
  'Accounting Manager',
  'Head of Open Data for Transparency',
  'Executive Assistant',
  'Researcher',
  'Project Coordinator',
  'Accounting Officer',
  'Research Assistant',
  'Center Manager of KRAC',
  'Content Writer and Curator',
  'Graphic Designer',
  'Content Coordinator',
  'Communication Officer',
  'Content Writer'
];

export const INITIAL_HOLIDAYS: CompanyHoliday[] = [
  { id: 'h-1', date: '2025-01-01', name: "New Year's Day" },
  { id: 'h-2', date: '2025-04-13', name: 'Songkran Festival' },
  { id: 'h-3', date: '2025-04-14', name: 'Songkran Festival' },
  { id: 'h-4', date: '2025-04-15', name: 'Songkran Festival' },
  { id: 'h-5', date: '2025-05-01', name: 'Labor Day' },
  { id: 'h-6', date: '2025-12-05', name: "Father's Day" },
  { id: 'h-7', date: '2025-12-31', name: "New Year's Eve" },
];

export const DEFAULT_BALANCES: LeaveBalance = {
  [LeaveType.SICK]: 30,
  [LeaveType.ANNUAL]: 6,
  [LeaveType.PERSONAL]: 4,
  [LeaveType.COMPENSATION]: 0,
  [LeaveType.MATERNITY_1]: 60,
  [LeaveType.MATERNITY_2]: 60,
  [LeaveType.TRAINING]: 30,
  [LeaveType.STERILIZATION]: 5,
  [LeaveType.ORDINATION]: 15,
  [LeaveType.UNPAID]: 30,
  [LeaveType.CHILD_CARE]: 15,
};

const DEFAULT_PASS = 'WORKSYNC-2025';

export const isWorkingDay = (date: Date, holidays: CompanyHoliday[] = INITIAL_HOLIDAYS): boolean => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const holidayDates = holidays.map(h => h.date);
  return !isWeekend(date) && !holidayDates.includes(dateStr);
};

export const MOCK_EMPLOYEES: Employee[] = [
  { 
    id: 'emp-admin', 
    name: 'Admin HAND SE', 
    nameTh: 'แอดมิน HAND SE',
    nameEn: 'Admin HAND SE',
    nicknameTh: 'แอดมิน',
    nicknameEn: 'Admin',
    nickname: 'Admin',
    phone: '089-999-9999',
    email: 'admin@hand.co.th',
    password: DEFAULT_PASS,
    baseLocation: 'HAND SE (Thonglor)',
    department: 'Executive', 
    position: 'General Manager', 
    role: 'Admin', 
    avatar: 'https://picsum.photos/seed/admin/100/100', 
    balances: DEFAULT_BALANCES 
  },
  { 
    id: 'emp-mgr-01', 
    name: 'Somchai Jaidee', 
    nameTh: 'สมชาย ใจดี',
    nameEn: 'Somchai Jaidee',
    nicknameTh: 'ชาย',
    nicknameEn: 'Chai',
    nickname: 'Chai',
    phone: '081-234-5678',
    email: 'somchai@hand.co.th',
    password: DEFAULT_PASS,
    baseLocation: 'HAND SE (Thonglor)',
    department: 'Research & Knowledge Management', 
    position: 'Managing Director', 
    role: 'Manager', 
    avatar: 'https://picsum.photos/seed/mgr1/100/100', 
    balances: DEFAULT_BALANCES 
  },
  { 
    id: 'emp-staff-01', 
    name: 'Somsak Rakthai', 
    nameTh: 'สมศักดิ์ รักไทย',
    nameEn: 'Somsak Rakthai',
    nicknameTh: 'ศักดิ์',
    nicknameEn: 'Sak',
    nickname: 'Sak',
    phone: '082-333-4444',
    email: 'somsak@hand.co.th',
    password: DEFAULT_PASS,
    baseLocation: 'KRAC (Chulalongkorn University)',
    department: 'Research & Knowledge Management', 
    position: 'Researcher', 
    role: 'Employee', 
    avatar: 'https://picsum.photos/seed/staff1/100/100', 
    managerId: 'emp-mgr-01', 
    balances: { ...DEFAULT_BALANCES, [LeaveType.ANNUAL]: 5 } 
  },
  { 
    id: 'emp-staff-02', 
    name: 'Wipa Kittichai', 
    nameTh: 'วิภา กิตติชัย',
    nameEn: 'Wipa Kittichai',
    nicknameTh: 'วิ',
    nicknameEn: 'Wipa',
    nickname: 'Wipa',
    phone: '083-444-5555',
    email: 'wipa@hand.co.th',
    password: DEFAULT_PASS,
    baseLocation: 'HAND SE (Thonglor)',
    department: 'Finance & Accounting', 
    position: 'Accounting Officer', 
    role: 'Employee', 
    avatar: 'https://picsum.photos/seed/staff2/100/100', 
    managerId: 'emp-admin', 
    balances: DEFAULT_BALANCES 
  },
  { 
    id: 'emp-mgr-02', 
    name: 'Kanya Wong', 
    nameTh: 'กันยา วงศ์',
    nameEn: 'Kanya Wong',
    nicknameTh: 'กัน',
    nicknameEn: 'Kan',
    nickname: 'Kan',
    phone: '085-666-7777',
    email: 'kanya@hand.co.th',
    password: DEFAULT_PASS,
    baseLocation: 'KRAC (Chulalongkorn University)',
    department: 'Coordination and Corporate Communications', 
    position: 'Communication Officer', 
    role: 'Manager', 
    avatar: 'https://picsum.photos/seed/mgr2/100/100', 
    managerId: 'emp-admin', 
    balances: DEFAULT_BALANCES 
  }
];

export const TYPE_COLORS = {
  [LocationType.WFH]: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    solid: 'bg-blue-500'
  },
  [LocationType.OFFICE_HANDSE]: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    solid: 'bg-emerald-500'
  },
  [LocationType.OFFICE_KRAC]: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    solid: 'bg-emerald-500'
  },
  [LocationType.OFFSITE]: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-200',
    solid: 'bg-orange-500'
  }
};

export const generateInitialLogs = (employees: Employee[] = MOCK_EMPLOYEES): WorkLog[] => {
  const logs: WorkLog[] = [];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  employees.forEach(emp => {
    for (let i = 0; i <= 20; i++) {
      const date = new Date(year, month, today.getDate() - i);
      if (!isWorkingDay(date)) continue;
      if (Math.random() > 0.85) continue;

      const dateStr = format(date, 'yyyy-MM-dd');
      const types = Object.values(LocationType);
      const type = types[Math.floor(Math.random() * types.length)];
      
      logs.push({
        id: `log-${emp.id}-${dateStr}`,
        employeeId: emp.id,
        date: dateStr,
        type: type,
        timestamp: new Date(date.setHours(9, Math.floor(Math.random() * 60), 0)).toISOString(),
        note: type === LocationType.OFFSITE ? 'Client Meeting' : undefined
      });
    }
  });
  return logs;
};