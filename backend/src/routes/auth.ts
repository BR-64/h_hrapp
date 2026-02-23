import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

function toEmployee(row: Record<string, unknown>) {
  const { password_hash, ...rest } = row;
  void password_hash;
  return {
    id: rest.id,
    name: rest.name,
    nameEn: rest.name_en,
    nameTh: rest.name_th,
    nickname: rest.nickname,
    nicknameEn: rest.nickname_en,
    nicknameTh: rest.nickname_th,
    phone: rest.phone,
    email: rest.email,
    role: rest.role,
    department: rest.department,
    position: rest.position,
    managerId: rest.manager_id,
    avatar: rest.avatar,
    baseLocation: rest.base_location,
    balances: JSON.parse((rest.leave_balance as string) || '{}'),
    additionalEmails: JSON.parse((rest.additional_emails as string) || '[]'),
    startDate: rest.start_date,
  };
}

function signToken(payload: { id: string; role: string; email: string }) {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

// POST /api/auth/login
router.post('/login', (req: Request, res: Response): void => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const row = db
    .prepare('SELECT * FROM employees WHERE email = ?')
    .get(email) as Record<string, unknown> | undefined;

  if (!row || !bcrypt.compareSync(password, row.password_hash as string)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken({
    id: row.id as string,
    role: row.role as string,
    email: row.email as string,
  });
  res.json({ token, user: toEmployee(row) });
});

// POST /api/auth/register
router.post('/register', (req: Request, res: Response): void => {
  const { name, email, password, department, position } = req.body;
  if (!name || !email || !password || !department || !position) {
    res.status(400).json({ error: 'All fields required' });
    return;
  }

  const existing = db.prepare('SELECT id FROM employees WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const defaultBalances = {
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

  const id = `emp-${uuidv4().slice(0, 8)}`;
  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO employees (id, name, email, password_hash, role, department, position, leave_balance)
    VALUES (?, ?, ?, ?, 'Employee', ?, ?, ?)
  `).run(id, name, email, passwordHash, department, position, JSON.stringify(defaultBalances));

  const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as Record<string, unknown>;
  const token = signToken({ id, role: 'Employee', email });
  res.status(201).json({ token, user: toEmployee(row) });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const row = db
    .prepare('SELECT * FROM employees WHERE id = ?')
    .get(req.user!.id) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(toEmployee(row));
});

export default router;
