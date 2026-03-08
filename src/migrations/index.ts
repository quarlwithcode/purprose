import type Database from 'better-sqlite3';
import { migration as m001 } from './001_initial.js';

export interface Migration {
  version: number;
  name: string;
  up(db: Database.Database): void;
}

export const migrations: Migration[] = [m001];
