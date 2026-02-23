import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, withTransaction } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

function toLeaveRequest(row: Record<string, unknown>) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    type: row.type,
    startDate: row.start_date,
    endDate: row.end_date,
    duration: row.duration,
    totalDays: row.total_days,
    reason: row.reason,
    status: row.status,
    timestamp: row.timestamp,
    attachmentName: row.attachment_name,
    attachmentData: row.attachment_data,
    ccTo: JSON.parse((row.cc_to as string) || '[]'),
    remarks: row.remarks,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
  };
}

// GET /api/leave-requests
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { employeeId, status } = req.query as Record<string, string>;
  const { id: userId, role } = req.user!;

  let query = 'SELECT * FROM leave_requests WHERE 1=1';
  const params: unknown[] = [];

  if (role === 'Employee') {
    query += ' AND employee_id = ?';
    params.push(userId);
  } else if (role === 'Manager') {
    // Manager sees their own + direct reports
    const reports = db
      .prepare('SELECT id FROM employees WHERE manager_id = ?')
      .all(userId) as { id: string }[];
    const reportIds = reports.map(r => r.id);
    const visibleIds = [userId, ...reportIds];
    query += ` AND employee_id IN (${visibleIds.map(() => '?').join(',')})`;
    params.push(...visibleIds);
  }
  // Admin sees all

  if (employeeId && (role === 'Admin' || role === 'Manager')) {
    query += ' AND employee_id = ?';
    params.push(employeeId);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY timestamp DESC';

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
  res.json(rows.map(toLeaveRequest));
});

// POST /api/leave-requests
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const {
    type, startDate, endDate, duration, totalDays, reason,
    attachmentName, attachmentData, ccTo,
  } = req.body;

  if (!type || !startDate || !endDate || !duration || totalDays == null || !reason) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // Validate leave balance
  const emp = db
    .prepare('SELECT leave_balance FROM employees WHERE id = ?')
    .get(req.user!.id) as { leave_balance: string } | undefined;

  if (!emp) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  const balances = JSON.parse(emp.leave_balance || '{}');
  if (type !== 'Unpaid Leave' && balances[type] !== undefined && balances[type] < totalDays) {
    res.status(400).json({ error: `Insufficient leave balance. Available: ${balances[type]} days` });
    return;
  }

  const id = `leave-${uuidv4().slice(0, 8)}`;
  db.prepare(`
    INSERT INTO leave_requests (
      id, employee_id, type, start_date, end_date, duration,
      total_days, reason, status, timestamp, attachment_name,
      attachment_data, cc_to
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?)
  `).run(
    id, req.user!.id, type, startDate, endDate, duration,
    totalDays, reason, new Date().toISOString(),
    attachmentName ?? null, attachmentData ?? null,
    JSON.stringify(ccTo || [])
  );

  const row = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id) as Record<string, unknown>;
  res.status(201).json(toLeaveRequest(row));
});

// PATCH /api/leave-requests/:id/status
router.patch('/:id/status', requireAuth, requireRole('Manager', 'Admin'), (req: AuthenticatedRequest, res: Response): void => {
  const { status, remarks } = req.body;
  if (!status || !['Approved', 'Rejected'].includes(status)) {
    res.status(400).json({ error: 'status must be Approved or Rejected' });
    return;
  }

  const row = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: 'Leave request not found' });
    return;
  }

  if (row.status !== 'Pending') {
    res.status(400).json({ error: 'Can only update Pending requests' });
    return;
  }

  // Manager authorization: can only approve their own direct reports
  if (req.user!.role === 'Manager') {
    const emp = db.prepare('SELECT manager_id FROM employees WHERE id = ?').get(row.employee_id as string) as { manager_id: string } | undefined;
    if (!emp || emp.manager_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to review this request' });
      return;
    }
  }

  // Atomic update with optional balance deduction
  withTransaction(() => {
    if (status === 'Approved') {
      const emp = db.prepare('SELECT leave_balance FROM employees WHERE id = ?').get(row.employee_id as string) as { leave_balance: string };
      const balances = JSON.parse(emp.leave_balance || '{}');
      const leaveType = row.type as string;
      if (balances[leaveType] !== undefined) {
        balances[leaveType] = Math.max(0, balances[leaveType] - (row.total_days as number));
        db.prepare('UPDATE employees SET leave_balance = ? WHERE id = ?')
          .run(JSON.stringify(balances), row.employee_id as string);
      }
    }

    db.prepare(`
      UPDATE leave_requests
      SET status = ?, reviewed_by = ?, reviewed_at = ?, remarks = ?
      WHERE id = ?
    `).run(status, req.user!.id, new Date().toISOString(), remarks ?? null, req.params.id);
  });

  const updated = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id) as Record<string, unknown>;
  res.json(toLeaveRequest(updated));
});

// DELETE /api/leave-requests/:id  (cancel own pending, or Admin hard-delete)
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const row = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: 'Leave request not found' });
    return;
  }

  const isAdmin = req.user!.role === 'Admin';
  const isOwner = row.employee_id === req.user!.id;

  if (!isAdmin && !isOwner) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (isOwner && !isAdmin) {
    if (row.status !== 'Pending') {
      res.status(400).json({ error: 'Can only cancel Pending requests' });
      return;
    }
    // Soft cancel
    db.prepare("UPDATE leave_requests SET status = 'Cancelled' WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id) as Record<string, unknown>;
    res.json(toLeaveRequest(updated));
    return;
  }

  db.prepare('DELETE FROM leave_requests WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
