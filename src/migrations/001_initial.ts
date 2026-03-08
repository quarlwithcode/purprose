import type Database from 'better-sqlite3';

export const migration = {
  version: 1,
  name: 'initial',
  up(db: Database.Database): void {
    db.exec(`
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
    `);
  },
};
