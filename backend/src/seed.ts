import bcrypt from 'bcryptjs';
import { db } from './db';

const DEFAULT_BALANCES = {
  'Sick Leave': 30,
  'Annual Leave': 6,
  'Personal Leave': 4,
  'Holiday Compensation': 0,
  'Maternity Leave (1st 60 Days)': 60,
  'Maternity Leave (2nd 60 Days)': 60,
  'Training Leave': 30,
  'Sterilization Leave': 5,
  'Ordination Leave': 15,
  'Unpaid Leave': 30,
  'Child Care Sick Leave': 15,
};

const DEPARTMENTS = [
  'Executive',
  'Coordination and Corporate Communications',
  'Research & Knowledge Management',
  'Finance & Accounting',
  'Open Data Transparency and Participation',
];

const POSITIONS = [
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
  'Content Writer',
];

const INITIAL_HOLIDAYS = [
  { id: 'h-1', date: '2025-01-01', name: "New Year's Day" },
  { id: 'h-2', date: '2025-04-13', name: 'Songkran Festival' },
  { id: 'h-3', date: '2025-04-14', name: 'Songkran Festival' },
  { id: 'h-4', date: '2025-04-15', name: 'Songkran Festival' },
  { id: 'h-5', date: '2025-05-01', name: 'Labor Day' },
  { id: 'h-6', date: '2025-12-05', name: "Father's Day" },
  { id: 'h-7', date: '2025-12-31', name: "New Year's Eve" },
];

const MOCK_EMPLOYEES = [
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
    baseLocation: 'HAND SE (Thonglor)',
    department: 'Executive',
    position: 'General Manager',
    role: 'Admin',
    avatar: 'https://picsum.photos/seed/admin/100/100',
    managerId: null,
    balances: DEFAULT_BALANCES,
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
    baseLocation: 'HAND SE (Thonglor)',
    department: 'Research & Knowledge Management',
    position: 'Managing Director',
    role: 'Manager',
    avatar: 'https://picsum.photos/seed/mgr1/100/100',
    managerId: null,
    balances: DEFAULT_BALANCES,
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
    baseLocation: 'KRAC (Chulalongkorn University)',
    department: 'Research & Knowledge Management',
    position: 'Researcher',
    role: 'Employee',
    avatar: 'https://picsum.photos/seed/staff1/100/100',
    managerId: 'emp-mgr-01',
    balances: { ...DEFAULT_BALANCES, 'Annual Leave': 5 },
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
    baseLocation: 'HAND SE (Thonglor)',
    department: 'Finance & Accounting',
    position: 'Accounting Officer',
    role: 'Employee',
    avatar: 'https://picsum.photos/seed/staff2/100/100',
    managerId: 'emp-admin',
    balances: DEFAULT_BALANCES,
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
    baseLocation: 'KRAC (Chulalongkorn University)',
    department: 'Coordination and Corporate Communications',
    position: 'Communication Officer',
    role: 'Manager',
    avatar: 'https://picsum.photos/seed/mgr2/100/100',
    managerId: 'emp-admin',
    balances: DEFAULT_BALANCES,
  },
];

export function seed() {
  const row = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number };
  if (row.count > 0) return;

  console.log('Seeding database...');
  const passwordHash = bcrypt.hashSync('WORKSYNC-2025', 10);

  const insertEmployee = db.prepare(`
    INSERT INTO employees (
      id, name, name_en, name_th, nickname, nickname_en, nickname_th,
      phone, email, password_hash, role, department, position,
      manager_id, avatar, base_location, leave_balance
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const emp of MOCK_EMPLOYEES) {
    insertEmployee.run(
      emp.id,
      emp.name,
      emp.nameEn ?? null,
      emp.nameTh ?? null,
      emp.nickname ?? null,
      emp.nicknameEn ?? null,
      emp.nicknameTh ?? null,
      emp.phone ?? null,
      emp.email,
      passwordHash,
      emp.role,
      emp.department,
      emp.position,
      emp.managerId ?? null,
      emp.avatar ?? null,
      emp.baseLocation ?? null,
      JSON.stringify(emp.balances)
    );
  }

  const insertHoliday = db.prepare(
    'INSERT OR IGNORE INTO company_holidays (id, date, name) VALUES (?, ?, ?)'
  );
  for (const h of INITIAL_HOLIDAYS) {
    insertHoliday.run(h.id, h.date, h.name);
  }

  db.prepare("INSERT OR IGNORE INTO settings VALUES ('departments', ?)").run(
    JSON.stringify(DEPARTMENTS)
  );
  db.prepare("INSERT OR IGNORE INTO settings VALUES ('positions', ?)").run(
    JSON.stringify(POSITIONS)
  );

  console.log('Database seeded successfully.');
}
