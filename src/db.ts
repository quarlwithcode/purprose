import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';
import type { StoredProposal, ProposalStatus, ProposalFilters, StatusHistoryEntry, Proposal } from './types.js';

const SCHEMA_VERSION = 1;

let db: Database.Database | null = null;

function getDbPath(): string {
  if (process.env.PURPROSE_DB_PATH) {
    return process.env.PURPROSE_DB_PATH;
  }
  const dir = join(homedir(), '.purprose');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, 'proposals.db');
}

export function getDb(): Database.Database {
  if (db) return db;
  const dbPath = getDbPath();
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

export function initDb(database: Database.Database): void {
  db = database;
  db.pragma('foreign_keys = ON');
  runMigrations(db);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    )
  `);

  const row = database.prepare('SELECT MAX(version) as v FROM schema_version').get() as { v: number | null } | undefined;
  const currentVersion = row?.v ?? 0;

  if (currentVersion < 1) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS proposals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        client_name TEXT NOT NULL,
        client_company TEXT,
        prepared_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        total_value REAL NOT NULL DEFAULT 0,
        proposal_json TEXT NOT NULL,
        template_id TEXT DEFAULT 'default',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proposal_id TEXT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        from_status TEXT,
        to_status TEXT NOT NULL,
        notes TEXT,
        changed_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
      CREATE INDEX IF NOT EXISTS idx_proposals_client ON proposals(client_name);
      CREATE INDEX IF NOT EXISTS idx_proposals_created ON proposals(created_at);
      CREATE INDEX IF NOT EXISTS idx_status_history_proposal ON status_history(proposal_id);

      INSERT INTO schema_version (version) VALUES (1);
    `);
  }
}

function rowToStoredProposal(row: any): StoredProposal {
  return {
    id: row.id,
    title: row.title,
    clientName: row.client_name,
    clientCompany: row.client_company || undefined,
    preparedBy: row.prepared_by,
    status: row.status as ProposalStatus,
    totalValue: row.total_value,
    proposal: JSON.parse(row.proposal_json),
    templateId: row.template_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function saveProposal(
  proposal: Proposal,
  templateId: string = 'default',
  status: ProposalStatus = 'draft'
): StoredProposal {
  const database = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const totalValue = proposal.investment.reduce((sum, item) => sum + item.amount, 0);

  database.prepare(`
    INSERT INTO proposals (id, title, client_name, client_company, prepared_by, status, total_value, proposal_json, template_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    proposal.title,
    proposal.clientName,
    proposal.clientCompany || null,
    proposal.preparedBy,
    status,
    totalValue,
    JSON.stringify(proposal),
    templateId,
    now,
    now
  );

  // Record initial status
  database.prepare(`
    INSERT INTO status_history (proposal_id, from_status, to_status, changed_at)
    VALUES (?, NULL, ?, ?)
  `).run(id, status, now);

  return {
    id,
    title: proposal.title,
    clientName: proposal.clientName,
    clientCompany: proposal.clientCompany,
    preparedBy: proposal.preparedBy,
    status,
    totalValue,
    proposal,
    templateId,
    createdAt: now,
    updatedAt: now,
  };
}

export function getProposal(id: string): StoredProposal | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
  return row ? rowToStoredProposal(row) : null;
}

export function listProposals(filters: ProposalFilters = {}): { proposals: StoredProposal[]; total: number } {
  const database = getDb();
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.client) {
    conditions.push('client_name LIKE ?');
    params.push(`%${filters.client}%`);
  }
  if (filters.dateFrom) {
    conditions.push('created_at >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push('created_at <= ?');
    params.push(filters.dateTo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = database.prepare(`SELECT COUNT(*) as count FROM proposals ${where}`).get(...params) as { count: number };
  const total = countRow.count;

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const rows = database.prepare(
    `SELECT * FROM proposals ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return {
    proposals: rows.map(rowToStoredProposal),
    total,
  };
}

export function updateProposalStatus(
  id: string,
  newStatus: ProposalStatus,
  notes?: string
): StoredProposal | null {
  const database = getDb();
  const existing = database.prepare('SELECT * FROM proposals WHERE id = ?').get(id) as any;
  if (!existing) return null;

  const now = new Date().toISOString();
  const oldStatus = existing.status;

  database.prepare('UPDATE proposals SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, now, id);

  database.prepare(`
    INSERT INTO status_history (proposal_id, from_status, to_status, notes, changed_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, oldStatus, newStatus, notes || null, now);

  const updated = database.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
  return updated ? rowToStoredProposal(updated) : null;
}

export function updateProposal(
  id: string,
  proposal: Proposal,
  templateId?: string
): StoredProposal | null {
  const database = getDb();
  const existing = database.prepare('SELECT * FROM proposals WHERE id = ?').get(id) as any;
  if (!existing) return null;

  const now = new Date().toISOString();
  const totalValue = proposal.investment.reduce((sum, item) => sum + item.amount, 0);

  const stmt = templateId
    ? database.prepare(`
        UPDATE proposals SET title = ?, client_name = ?, client_company = ?, prepared_by = ?,
        total_value = ?, proposal_json = ?, template_id = ?, updated_at = ? WHERE id = ?
      `)
    : database.prepare(`
        UPDATE proposals SET title = ?, client_name = ?, client_company = ?, prepared_by = ?,
        total_value = ?, proposal_json = ?, updated_at = ? WHERE id = ?
      `);

  const params = [
    proposal.title,
    proposal.clientName,
    proposal.clientCompany || null,
    proposal.preparedBy,
    totalValue,
    JSON.stringify(proposal),
    ...(templateId ? [templateId] : []),
    now,
    id,
  ];

  stmt.run(...params);

  const updated = database.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
  return updated ? rowToStoredProposal(updated) : null;
}

export function deleteProposal(id: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM proposals WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getProposalHistory(id: string): StatusHistoryEntry[] {
  const database = getDb();
  const rows = database.prepare(
    'SELECT * FROM status_history WHERE proposal_id = ? ORDER BY changed_at ASC'
  ).all(id) as any[];

  return rows.map(row => ({
    id: row.id,
    proposalId: row.proposal_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    notes: row.notes,
    changedAt: row.changed_at,
  }));
}

// Pipeline analytics queries
export interface PipelineSummary {
  total: number;
  byStatus: Record<string, { count: number; value: number }>;
  totalActiveValue: number;
  weightedValue: number;
  winLoss: {
    won: number;
    lost: number;
    winRate: number;
    avgWonValue: number;
    avgLostValue: number;
  };
  recentActivity: StatusHistoryEntry[];
  topClients: Array<{ client: string; count: number; totalValue: number }>;
}

const STATUS_WEIGHTS: Record<string, number> = {
  draft: 0.1,
  reviewed: 0.25,
  sent: 0.5,
  approved: 0.75,
};

export function getPipelineSummary(filters: { dateFrom?: string; dateTo?: string; client?: string } = {}): PipelineSummary {
  const database = getDb();
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.dateFrom) {
    conditions.push('created_at >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push('created_at <= ?');
    params.push(filters.dateTo);
  }
  if (filters.client) {
    conditions.push('client_name LIKE ?');
    params.push(`%${filters.client}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count and value by status
  const statusRows = database.prepare(
    `SELECT status, COUNT(*) as count, COALESCE(SUM(total_value), 0) as value FROM proposals ${where} GROUP BY status`
  ).all(...params) as any[];

  const byStatus: Record<string, { count: number; value: number }> = {};
  let total = 0;
  let totalActiveValue = 0;
  let weightedValue = 0;

  for (const row of statusRows) {
    byStatus[row.status] = { count: row.count, value: row.value };
    total += row.count;
    const weight = STATUS_WEIGHTS[row.status];
    if (weight !== undefined) {
      totalActiveValue += row.value;
      weightedValue += row.value * weight;
    }
  }

  // Win/loss stats
  const wonStats = byStatus['won'] || { count: 0, value: 0 };
  const lostStats = byStatus['lost'] || { count: 0, value: 0 };
  const totalDecided = wonStats.count + lostStats.count;

  const winLoss = {
    won: wonStats.count,
    lost: lostStats.count,
    winRate: totalDecided > 0 ? Math.round((wonStats.count / totalDecided) * 100) : 0,
    avgWonValue: wonStats.count > 0 ? Math.round(wonStats.value / wonStats.count) : 0,
    avgLostValue: lostStats.count > 0 ? Math.round(lostStats.value / lostStats.count) : 0,
  };

  // Recent activity (last 10 status changes)
  const activityRows = database.prepare(`
    SELECT sh.* FROM status_history sh
    JOIN proposals p ON sh.proposal_id = p.id
    ${where ? where.replace('created_at', 'p.created_at').replace('client_name', 'p.client_name') : ''}
    ORDER BY sh.changed_at DESC LIMIT 10
  `).all(...params) as any[];

  const recentActivity: StatusHistoryEntry[] = activityRows.map(row => ({
    id: row.id,
    proposalId: row.proposal_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    notes: row.notes,
    changedAt: row.changed_at,
  }));

  // Top clients
  const clientRows = database.prepare(`
    SELECT client_name, COUNT(*) as count, COALESCE(SUM(total_value), 0) as total_value
    FROM proposals ${where}
    GROUP BY client_name
    ORDER BY total_value DESC
    LIMIT 10
  `).all(...params) as any[];

  const topClients = clientRows.map(row => ({
    client: row.client_name,
    count: row.count,
    totalValue: row.total_value,
  }));

  return {
    total,
    byStatus,
    totalActiveValue,
    weightedValue,
    winLoss,
    recentActivity,
    topClients,
  };
}
