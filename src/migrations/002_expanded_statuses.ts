import type Database from 'better-sqlite3';

// Status is stored as TEXT, so no schema DDL changes needed.
// This migration registers as v2 for tracking purposes.
export const migration = {
  version: 2,
  name: 'expanded_statuses',
  up(_db: Database.Database): void {
    // No DDL needed — status column is TEXT and accepts any string.
    // New statuses: internal_review, viewed, revision_requested, rejected, archived
  },
};
