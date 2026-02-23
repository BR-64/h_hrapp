import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'hand_hr.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

export function withTransaction(fn: () => void): void {
  db.exec('BEGIN');
  try {
    fn();
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      name_en       TEXT,
      name_th       TEXT,
      nickname      TEXT,
      nickname_en   TEXT,
      nickname_th   TEXT,
      phone         TEXT,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'Employee',
      department    TEXT NOT NULL,
      position      TEXT NOT NULL,
      manager_id    TEXT,
      avatar        TEXT,
      base_location TEXT,
      leave_balance TEXT NOT NULL DEFAULT '{}',
      start_date    TEXT,
      additional_emails TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS work_logs (
      id          TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      date        TEXT NOT NULL,
      type        TEXT NOT NULL,
      timestamp   TEXT NOT NULL,
      note        TEXT,
      start_time  TEXT,
      end_time    TEXT
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id              TEXT PRIMARY KEY,
      employee_id     TEXT NOT NULL,
      type            TEXT NOT NULL,
      start_date      TEXT NOT NULL,
      end_date        TEXT NOT NULL,
      duration        TEXT NOT NULL,
      total_days      REAL NOT NULL,
      reason          TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'Pending',
      timestamp       TEXT NOT NULL,
      attachment_name TEXT,
      attachment_data TEXT,
      cc_to           TEXT DEFAULT '[]',
      remarks         TEXT,
      reviewed_by     TEXT,
      reviewed_at     TEXT
    );

    CREATE TABLE IF NOT EXISTS company_holidays (
      id   TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
