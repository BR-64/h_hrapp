import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

function toWorkLog(row: Record<string, unknown>) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    type: row.type,
    timestamp: row.timestamp,
    note: row.note,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}

// GET /api/work-logs
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { employeeId, startDate, endDate } = req.query as Record<string, string>;
  const isAdminOrManager = req.user!.role !== 'Employee';

  let query = 'SELECT * FROM work_logs WHERE 1=1';
  const params: unknown[] = [];

  if (employeeId) {
    // Only Admin/Manager can query other employees
    if (employeeId !== req.user!.id && !isAdminOrManager) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    query += ' AND employee_id = ?';
    params.push(employeeId);
  } else if (!isAdminOrManager) {
    // Regular employees only see their own logs
    query += ' AND employee_id = ?';
    params.push(req.user!.id);
  }

  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY date DESC, start_time ASC';

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
  res.json(rows.map(toWorkLog));
});

// POST /api/work-logs
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const {
    date, type, note, customTimestamp, startTime, endTime, employeeId: bodyEmployeeId
  } = req.body;

  if (!date || !type) {
    res.status(400).json({ error: 'date and type are required' });
    return;
  }

  const isAdminOrManager = req.user!.role !== 'Employee';
  const employeeId = (isAdminOrManager && bodyEmployeeId) ? bodyEmployeeId : req.user!.id;

  const dates: string[] = Array.isArray(date) ? date : [date];
  const results = [];

  for (const d of dates) {
    // Upsert logic: full-day replaces all existing; partial-day replaces matching startTime or full-day
    if (!startTime) {
      db.prepare('DELETE FROM work_logs WHERE employee_id = ? AND date = ?').run(employeeId, d);
    } else {
      db.prepare(`
        DELETE FROM work_logs
        WHERE employee_id = ? AND date = ? AND (start_time IS NULL OR start_time = ?)
      `).run(employeeId, d, startTime);
    }

    const id = `log-${uuidv4().slice(0, 8)}`;
    const timestamp = customTimestamp || new Date().toISOString();

    db.prepare(`
      INSERT INTO work_logs (id, employee_id, date, type, timestamp, note, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, employeeId, d, type, timestamp, note ?? null, startTime ?? null, endTime ?? null);

    const row = db.prepare('SELECT * FROM work_logs WHERE id = ?').get(id) as Record<string, unknown>;
    results.push(toWorkLog(row));
  }

  res.status(201).json(dates.length === 1 ? results[0] : results);
});

// DELETE /api/work-logs/:id
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const row = db.prepare('SELECT * FROM work_logs WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: 'Work log not found' });
    return;
  }

  const isAdmin = req.user!.role === 'Admin';
  if (row.employee_id !== req.user!.id && !isAdmin) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  db.prepare('DELETE FROM work_logs WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
