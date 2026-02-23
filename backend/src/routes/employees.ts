import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

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

// GET /api/employees
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const rows = db.prepare('SELECT * FROM employees ORDER BY name').all() as Record<string, unknown>[];
  res.json(rows.map(toEmployee));
});

// GET /api/employees/:id
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }
  res.json(toEmployee(row));
});

// POST /api/employees
router.post('/', requireAuth, requireRole('Admin'), (req: AuthenticatedRequest, res: Response): void => {
  const {
    name, nameEn, nameTh, nickname, nicknameEn, nicknameTh,
    phone, email, password, role, department, position,
    managerId, avatar, baseLocation, balances, startDate,
  } = req.body;

  if (!name || !email || !password || !department || !position) {
    res.status(400).json({ error: 'name, email, password, department, position are required' });
    return;
  }

  const existing = db.prepare('SELECT id FROM employees WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const id = req.body.id || `emp-${uuidv4().slice(0, 8)}`;
  const passwordHash = bcrypt.hashSync(password, 10);
  const defaultBalances = {
    'Sick Leave': 30, 'Annual Leave': 6, 'Personal Leave': 4,
    'Holiday Compensation': 0, 'Maternity Leave (1st 60 Days)': 60,
    'Maternity Leave (2nd 60 Days)': 60, 'Training Leave': 30,
    'Sterilization Leave': 5, 'Ordination Leave': 15,
    'Unpaid Leave': 30, 'Child Care Sick Leave': 15,
  };

  db.prepare(`
    INSERT INTO employees (
      id, name, name_en, name_th, nickname, nickname_en, nickname_th,
      phone, email, password_hash, role, department, position,
      manager_id, avatar, base_location, leave_balance, start_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name, nameEn ?? null, nameTh ?? null,
    nickname ?? null, nicknameEn ?? null, nicknameTh ?? null,
    phone ?? null, email, passwordHash,
    role || 'Employee', department, position,
    managerId ?? null, avatar ?? null, baseLocation ?? null,
    JSON.stringify(balances || defaultBalances),
    startDate ?? null
  );

  const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as Record<string, unknown>;
  res.status(201).json(toEmployee(row));
});

// PUT /api/employees/:id
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const isSelf = req.user!.id === id;
  const isAdmin = req.user!.role === 'Admin';

  if (!isSelf && !isAdmin) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  const {
    name, nameEn, nameTh, nickname, nicknameEn, nicknameTh,
    phone, email, password, role, department, position,
    managerId, avatar, baseLocation, balances, startDate, additionalEmails,
  } = req.body;

  const passwordHash = password
    ? bcrypt.hashSync(password, 10)
    : (existing.password_hash as string);

  // Only Admin can change role
  const newRole = isAdmin && role ? role : existing.role;

  db.prepare(`
    UPDATE employees SET
      name = ?, name_en = ?, name_th = ?, nickname = ?,
      nickname_en = ?, nickname_th = ?, phone = ?, email = ?,
      password_hash = ?, role = ?, department = ?, position = ?,
      manager_id = ?, avatar = ?, base_location = ?,
      leave_balance = ?, start_date = ?, additional_emails = ?
    WHERE id = ?
  `).run(
    name ?? existing.name,
    nameEn ?? existing.name_en ?? null,
    nameTh ?? existing.name_th ?? null,
    nickname ?? existing.nickname ?? null,
    nicknameEn ?? existing.nickname_en ?? null,
    nicknameTh ?? existing.nickname_th ?? null,
    phone ?? existing.phone ?? null,
    email ?? existing.email,
    passwordHash,
    newRole,
    department ?? existing.department,
    position ?? existing.position,
    managerId !== undefined ? managerId : existing.manager_id,
    avatar ?? existing.avatar ?? null,
    baseLocation ?? existing.base_location ?? null,
    balances ? JSON.stringify(balances) : (existing.leave_balance as string),
    startDate ?? existing.start_date ?? null,
    additionalEmails ? JSON.stringify(additionalEmails) : (existing.additional_emails as string || '[]'),
    id
  );

  const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as Record<string, unknown>;
  res.json(toEmployee(row));
});

// DELETE /api/employees/:id
router.delete('/:id', requireAuth, requireRole('Admin'), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const row = db.prepare('SELECT id FROM employees WHERE id = ?').get(id);
  if (!row) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }
  if (req.user!.id === id) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }
  db.prepare('DELETE FROM employees WHERE id = ?').run(id);
  res.status(204).send();
});

export default router;
