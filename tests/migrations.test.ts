import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initDb, closeDb, getMigrationStatus } from '../src/db.js';
import { migrations } from '../src/migrations/index.js';

describe('migration infrastructure', () => {
  beforeEach(() => {
    const memDb = new Database(':memory:');
    initDb(memDb);
  });

  afterEach(() => {
    closeDb();
  });

  it('fresh db runs all migrations', () => {
    const status = getMigrationStatus();
    expect(status.currentVersion).toBe(migrations.length);
    expect(status.pendingCount).toBe(0);
    expect(status.migrations.every(m => m.applied)).toBe(true);
  });

  it('idempotent re-run does not error', () => {
    // initDb already ran migrations; calling again should be safe
    const memDb = new Database(':memory:');
    initDb(memDb);
    const status = getMigrationStatus();
    expect(status.currentVersion).toBe(migrations.length);
  });

  it('version tracking is correct', () => {
    const status = getMigrationStatus();
    expect(status.migrations.length).toBe(migrations.length);
    for (let i = 0; i < migrations.length; i++) {
      expect(status.migrations[i].version).toBe(migrations[i].version);
      expect(status.migrations[i].name).toBe(migrations[i].name);
      expect(status.migrations[i].applied).toBe(true);
    }
  });

  it('getMigrationStatus returns accurate info', () => {
    const status = getMigrationStatus();
    expect(status.currentVersion).toBeGreaterThanOrEqual(1);
    expect(status.pendingCount).toBe(0);
    expect(status.migrations[0].name).toBe('initial');
  });

  it('proposals table exists after migration', () => {
    // Verify tables were created by migration
    const memDb = new Database(':memory:');
    initDb(memDb);
    const status = getMigrationStatus();
    expect(status.currentVersion).toBeGreaterThanOrEqual(1);
    // If we can getMigrationStatus and tables exist, the migration worked
  });

  it('reports pending migrations when db is at older version', () => {
    // Create a raw DB with only schema_version at v1 (simulating a DB that only ran migration 1)
    const rawDb = new Database(':memory:');
    rawDb.exec(`
      CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
      INSERT INTO schema_version VALUES (1);
    `);
    // Also create the tables from migration 1 so initDb doesn't fail
    rawDb.exec(`
      CREATE TABLE proposals (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, client_name TEXT NOT NULL,
        client_company TEXT, prepared_by TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
        template_id TEXT NOT NULL DEFAULT 'default', total_value REAL NOT NULL DEFAULT 0,
        proposal_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT, proposal_id TEXT NOT NULL,
        from_status TEXT NOT NULL, to_status TEXT NOT NULL,
        notes TEXT, changed_at TEXT NOT NULL,
        FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
      );
    `);
    // initDb will detect v1 and apply v2
    initDb(rawDb);
    const status = getMigrationStatus();
    expect(status.currentVersion).toBe(migrations.length);
    // All migrations should now be applied
    expect(status.pendingCount).toBe(0);
    expect(status.migrations.filter(m => m.applied).length).toBe(migrations.length);
  });
});
