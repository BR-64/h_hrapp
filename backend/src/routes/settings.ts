import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

function getSetting(key: string): unknown {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? JSON.parse(row.value) : null;
}

function setSetting(key: string, value: unknown): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
}

// GET /api/settings/departments  (public — needed for register form)
router.get('/departments', (_req: Request, res: Response): void => {
  res.json(getSetting('departments') || []);
});

// PUT /api/settings/departments
router.put('/departments', requireAuth, requireRole('Admin'), (req: Request, res: Response): void => {
  const { departments } = req.body;
  if (!Array.isArray(departments)) {
    res.status(400).json({ error: 'departments must be an array' });
    return;
  }
  setSetting('departments', departments);
  res.json(departments);
});

// GET /api/settings/positions  (public)
router.get('/positions', (_req: Request, res: Response): void => {
  res.json(getSetting('positions') || []);
});

// PUT /api/settings/positions
router.put('/positions', requireAuth, requireRole('Admin'), (req: Request, res: Response): void => {
  const { positions } = req.body;
  if (!Array.isArray(positions)) {
    res.status(400).json({ error: 'positions must be an array' });
    return;
  }
  setSetting('positions', positions);
  res.json(positions);
});

export default router;
