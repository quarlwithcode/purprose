import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const execFileAsync = promisify(execFile);
const CLI_PATH = join(import.meta.dirname, '..', 'dist', 'cli.js');

const sampleProposal = {
  title: 'CLI Test Proposal',
  clientName: 'CLI Client',
  preparedBy: 'CLI Author',
  date: '2026-03-08',
  sections: [
    { title: 'Overview', content: 'Test overview content', type: 'text' },
  ],
  investment: [
    { item: 'Service', amount: 2500, recurring: false, frequency: 'one-time' },
  ],
  paymentTerms: { structure: '50-50' },
};

const SAMPLE_FILE = join(import.meta.dirname, 'cli-test-input.json');
const OUTPUT_FILE = join(import.meta.dirname, 'cli-test-output.html');

async function runCli(...args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync('node', [CLI_PATH, ...args], {
      env: { ...process.env, PURPROSE_DB_PATH: ':memory:' },
    });
  } catch (error: any) {
    return { stdout: error.stdout || '', stderr: error.stderr || '' };
  }
}

describe('CLI', () => {
  beforeAll(async () => {
    await writeFile(SAMPLE_FILE, JSON.stringify(sampleProposal, null, 2));
  });

  afterAll(async () => {
    for (const f of [SAMPLE_FILE, OUTPUT_FILE]) {
      if (existsSync(f)) await unlink(f);
    }
    const draftFile = join(import.meta.dirname, '..', 'cli-client-proposal-draft.json');
    if (existsSync(draftFile)) await unlink(draftFile);
  });

  it('shows help with no args', async () => {
    const { stdout } = await runCli();
    expect(stdout).toContain('purprose');
    expect(stdout).toContain('USAGE');
  });

  it('shows help with --help', async () => {
    const { stdout } = await runCli('--help');
    expect(stdout).toContain('COMMANDS');
  });

  it('generates HTML from JSON', async () => {
    const { stdout } = await runCli('generate', SAMPLE_FILE, '-o', OUTPUT_FILE);
    expect(stdout).toContain('Generated');
    expect(existsSync(OUTPUT_FILE)).toBe(true);

    const html = await readFile(OUTPUT_FILE, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('CLI Test Proposal');
  });

  it('validates correct proposal', async () => {
    const { stdout } = await runCli('validate', SAMPLE_FILE);
    expect(stdout).toContain('Valid');
  });

  it('validates incorrect proposal', async () => {
    const badFile = join(import.meta.dirname, 'cli-bad-input.json');
    await writeFile(badFile, JSON.stringify({ title: 'missing fields' }));
    try {
      const { stdout } = await runCli('validate', badFile);
      expect(stdout).toContain('Invalid');
    } finally {
      if (existsSync(badFile)) await unlink(badFile);
    }
  });

  it('creates draft', async () => {
    const { stdout } = await runCli(
      'draft',
      '--client', 'CLI Client',
      '--description', 'Test project',
      '--budget', '3000',
      '--by', 'Tester'
    );
    expect(stdout).toContain('Draft created');
  });

  it('errors on unknown command', async () => {
    const { stderr } = await runCli('foobar');
    expect(stderr).toContain('Unknown command');
  });

  it('errors on missing generate input', async () => {
    const { stderr } = await runCli('generate');
    expect(stderr).toContain('Input file required');
  });

  it('errors on missing draft args', async () => {
    const { stderr } = await runCli('draft', '--client', 'Test');
    expect(stderr).toContain('required');
  });

  it('errors on update with missing args', async () => {
    const { stderr } = await runCli('update');
    expect(stderr).toContain('required');
  });

  it('errors on clone with missing id', async () => {
    const { stderr } = await runCli('clone');
    expect(stderr).toContain('required');
  });

  it('migrate command outputs up-to-date message', async () => {
    const { stdout } = await runCli('migrate');
    expect(stdout).toContain('migration');
  });

  it('migrate status command outputs version info', async () => {
    const { stdout } = await runCli('migrate', 'status');
    expect(stdout).toContain('Migration Status');
    expect(stdout).toContain('Current version');
  });

  it('update command with nonexistent file gives file error', async () => {
    const { stderr } = await runCli('update', '00000000-0000-0000-0000-000000000000', '/tmp/nonexistent-purprose-file.json');
    expect(stderr).toContain('not found');
  });

  it('clone with nonexistent ID gives not-found error', async () => {
    const { stderr } = await runCli('clone', '00000000-0000-0000-0000-000000000001');
    expect(stderr).toContain('not found');
  });
});

describe('CLI short-ID prefix lookup', () => {
  let tempDbPath: string;
  const sampleFile = join(tmpdir(), `purprose-prefix-test-input.json`);

  beforeAll(async () => {
    await writeFile(sampleFile, JSON.stringify(sampleProposal, null, 2));
  });

  afterAll(async () => {
    if (existsSync(sampleFile)) await unlink(sampleFile);
  });

  beforeEach(async () => {
    tempDbPath = join(tmpdir(), `purprose-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  });

  afterEach(async () => {
    if (existsSync(tempDbPath)) await unlink(tempDbPath);
  });

  async function runCliWithDb(...args: string[]): Promise<{ stdout: string; stderr: string }> {
    try {
      return await execFileAsync('node', [CLI_PATH, ...args], {
        env: { ...process.env, PURPROSE_DB_PATH: tempDbPath },
      });
    } catch (error: any) {
      return { stdout: error.stdout || '', stderr: error.stderr || '' };
    }
  }

  it('get works with short ID prefix', async () => {
    const { stdout: genOut } = await runCliWithDb('generate', sampleFile, '--save');
    const match = genOut.match(/Saved to database: ([a-f0-9-]+)/);
    expect(match).toBeTruthy();
    const fullId = match![1];
    const shortId = fullId.slice(0, 8);

    const { stdout } = await runCliWithDb('get', shortId);
    expect(stdout).toContain('CLI Test Proposal');
  });

  it('get works with full UUID', async () => {
    const { stdout: genOut } = await runCliWithDb('generate', sampleFile, '--save');
    const match = genOut.match(/Saved to database: ([a-f0-9-]+)/);
    expect(match).toBeTruthy();
    const fullId = match![1];

    const { stdout } = await runCliWithDb('get', fullId);
    expect(stdout).toContain('CLI Test Proposal');
  });

  it('status works with short ID prefix', async () => {
    const { stdout: genOut } = await runCliWithDb('generate', sampleFile, '--save');
    const match = genOut.match(/Saved to database: ([a-f0-9-]+)/);
    expect(match).toBeTruthy();
    const shortId = match![1].slice(0, 8);

    const { stdout } = await runCliWithDb('status', shortId, 'internal_review', '--notes', 'test');
    expect(stdout).toContain('internal_review');
  });

  it('delete works with short ID prefix', async () => {
    const { stdout: genOut } = await runCliWithDb('generate', sampleFile, '--save');
    const match = genOut.match(/Saved to database: ([a-f0-9-]+)/);
    expect(match).toBeTruthy();
    const shortId = match![1].slice(0, 8);

    const { stdout } = await runCliWithDb('delete', shortId);
    expect(stdout).toContain('Deleted');
  });

  it('clone works with short ID prefix', async () => {
    const { stdout: genOut } = await runCliWithDb('generate', sampleFile, '--save');
    const match = genOut.match(/Saved to database: ([a-f0-9-]+)/);
    expect(match).toBeTruthy();
    const shortId = match![1].slice(0, 8);

    const { stdout } = await runCliWithDb('clone', shortId, '--client', 'New Client');
    expect(stdout).toContain('Cloned');
    expect(stdout).toContain('New Client');
  });

  it('shows error for non-matching prefix', async () => {
    const { stderr } = await runCliWithDb('get', 'zzzzzzzz');
    expect(stderr).toContain('No unique proposal found for prefix');
  });
});
