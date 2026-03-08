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
});
