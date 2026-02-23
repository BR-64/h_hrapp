import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

// GET /api/holidays
router.get('/', requireAuth, (_req: Request, res: Response): void => {
  const rows = db.prepare('SELECT * FROM company_holidays ORDER BY date').all();
  res.json(rows);
});

// POST /api/holidays
router.post('/', requireAuth, requireRole('Admin'), (req: Request, res: Response): void => {
  const { date, name } = req.body;
  if (!date || !name) {
    res.status(400).json({ error: 'date and name are required' });
    return;
  }

  const id = `h-${uuidv4().slice(0, 8)}`;
  try {
    db.prepare('INSERT INTO company_holidays (id, date, name) VALUES (?, ?, ?)').run(id, date, name);
  } catch {
    res.status(409).json({ error: 'A holiday already exists on that date' });
    return;
  }

  const row = db.prepare('SELECT * FROM company_holidays WHERE id = ?').get(id);
  res.status(201).json(row);
});

// DELETE /api/holidays/:id
router.delete('/:id', requireAuth, requireRole('Admin'), (req: Request, res: Response): void => {
  const row = db.prepare('SELECT id FROM company_holidays WHERE id = ?').get(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Holiday not found' });
    return;
  }
  db.prepare('DELETE FROM company_holidays WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// POST /api/holidays/fetch-ai  (Gemini AI integration — server-side only)
router.post('/fetch-ai', requireAuth, requireRole('Admin'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'GEMINI_API_KEY not configured on server' });
    return;
  }

  try {
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const currentYear = new Date().getFullYear();
    const yearsToFetch = [currentYear - 1, currentYear, currentYear + 1];

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `List all official Thai public holidays for the years ${yearsToFetch.join(', ')}. Return clean JSON array.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              date: { type: Type.STRING },
              name: { type: Type.STRING },
            },
            required: ['id', 'date', 'name'],
          },
        },
      },
    });

    const fetched = JSON.parse(response.text) as { id: string; date: string; name: string }[];
    if (!Array.isArray(fetched)) {
      res.status(502).json({ error: 'Unexpected response from AI' });
      return;
    }

    const insert = db.prepare('INSERT OR IGNORE INTO company_holidays (id, date, name) VALUES (?, ?, ?)');
    let added = 0;
    for (const h of fetched) {
      const id = `h-ai-${uuidv4().slice(0, 8)}`;
      const result = insert.run(id, h.date, h.name);
      if (result.changes > 0) added++;
    }

    const all = db.prepare('SELECT * FROM company_holidays ORDER BY date').all();
    res.json({ added, holidays: all });
  } catch (err) {
    console.error('Gemini fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch holidays from AI' });
  }
});

export default router;
