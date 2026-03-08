import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

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
});
