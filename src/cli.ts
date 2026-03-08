#!/usr/bin/env node
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import {
  generate_proposal,
  draft_proposal,
  validate_proposal,
  list_proposals,
  get_proposal,
  update_proposal_status,
  delete_proposal,
} from './handlers.js';
import { isPuppeteerAvailable, htmlToPdf } from './pdf.js';
import { getMigrationStatus } from './db.js';

const HELP = `
purprose — Proposal Generation & Management CLI

USAGE:
  purprose generate <input.json> [--output <file>] [--format html|pdf] [--template default|minimal|professional] [--save]
  purprose draft --client <name> --description <text> --budget <amount> --by <preparer>
  purprose validate <input.json>
  purprose list [--status <s>] [--client <name>]
  purprose get <id>
  purprose status <id> <new-status> [--notes "reason"]
  purprose delete <id>
  purprose migrate
  purprose migrate status
  purprose help

COMMANDS:
  generate    Generate proposal from JSON input file
  draft       Create draft proposal from basic info
  validate    Validate proposal JSON structure
  list        List saved proposals
  get         Retrieve a saved proposal by ID
  status      Update proposal status
  delete      Delete a saved proposal
  migrate     Run pending database migrations
  migrate status  Show migration status

OPTIONS:
  --output, -o      Output file path (default: proposal.html)
  --format, -f      Output format: html (default), pdf
  --template, -t    Template: default, minimal, professional
  --save            Save proposal to database after generation
  --client          Client name (for draft/list)
  --description     Project description (for draft)
  --budget          Estimated budget (for draft)
  --by              Preparer name (for draft)
  --status          Filter by status (for list)
  --notes           Notes for status change

EXAMPLES:
  # Generate from JSON
  purprose generate proposal-data.json -o client-proposal.html

  # Generate and save to database
  purprose generate proposal-data.json --save

  # Generate PDF (requires puppeteer)
  purprose generate proposal-data.json -f pdf -o proposal.pdf

  # Create draft
  purprose draft --client "Acme Corp" --description "Website redesign" --budget 5000 --by "Your Name"

  # Validate structure
  purprose validate proposal-data.json

  # List proposals
  purprose list --status draft --client "Acme"

  # Update status
  purprose status abc-123 sent --notes "Emailed to client"

  # Get proposal details
  purprose get abc-123

  # Delete proposal
  purprose delete abc-123
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case 'generate': {
      const inputFile = args[1];
      if (!inputFile) {
        console.error('Error: Input file required');
        console.log('Usage: purprose generate <input.json> [--output <file>]');
        process.exit(1);
      }

      if (!existsSync(inputFile)) {
        console.error(`Error: File not found: ${inputFile}`);
        process.exit(1);
      }

      let outputFile = 'proposal.html';
      let format = 'html';
      let template = 'default';
      let save = false;

      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--output' || args[i] === '-o') {
          outputFile = args[++i];
        } else if (args[i] === '--format' || args[i] === '-f') {
          format = args[++i];
        } else if (args[i] === '--template' || args[i] === '-t') {
          template = args[++i];
        } else if (args[i] === '--save') {
          save = true;
        }
      }

      try {
        const content = await readFile(inputFile, 'utf-8');
        const proposalData = JSON.parse(content);

        const result = await generate_proposal({
          proposal: proposalData,
          outputFormat: format as 'html' | 'pdf',
          templateId: template,
          save,
        });

        if (!result.success || !result.data) {
          console.error('Error:', result.error);
          process.exit(1);
        }

        if (format === 'pdf') {
          const available = await isPuppeteerAvailable();
          if (available && result.data.pdf) {
            if (!outputFile.endsWith('.pdf')) outputFile = outputFile.replace(/\.html$/, '') + '.pdf';
            await writeFile(outputFile, Buffer.from(result.data.pdf, 'base64'));
            console.log(`Generated PDF: ${outputFile}`);
          } else {
            console.log('PDF generation requires puppeteer. Install with: npm install puppeteer');
            console.log('Falling back to HTML output.');
            await writeFile(outputFile, result.data.html!);
            console.log(`Generated HTML: ${outputFile}`);
          }
        } else {
          await writeFile(outputFile, result.data.html!);
          console.log(`Generated: ${outputFile}`);
        }

        if (save && result.data.id) {
          console.log(`Saved to database: ${result.data.id}`);
        }
      } catch (err: any) {
        console.error('Error:', err.message);
        process.exit(1);
      }
      break;
    }

    case 'draft': {
      let client = '';
      let description = '';
      let budget = 0;
      let preparedBy = '';

      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--client') client = args[++i];
        else if (args[i] === '--description') description = args[++i];
        else if (args[i] === '--budget') budget = parseFloat(args[++i]);
        else if (args[i] === '--by') preparedBy = args[++i];
      }

      if (!client || !description || !preparedBy) {
        console.error('Error: --client, --description, and --by are required');
        process.exit(1);
      }

      const result = await draft_proposal({
        clientName: client,
        projectDescription: description,
        estimatedBudget: budget || undefined,
        preparedBy,
      });

      if (!result.success || !result.data) {
        console.error('Error:', result.error);
        process.exit(1);
      }

      const outputFile = `${client.toLowerCase().replace(/\s+/g, '-')}-proposal-draft.json`;
      await writeFile(outputFile, JSON.stringify(result.data, null, 2));
      console.log(`Draft created: ${outputFile}`);
      break;
    }

    case 'validate': {
      const inputFile = args[1];
      if (!inputFile) {
        console.error('Error: Input file required');
        process.exit(1);
      }

      try {
        const content = await readFile(inputFile, 'utf-8');
        const data = JSON.parse(content);
        const result = await validate_proposal(data);

        if (result.data?.valid) {
          console.log('Valid proposal structure');
        } else {
          console.log('Invalid proposal:');
          result.data?.errors?.forEach(e => console.log(`  - ${e}`));
          process.exit(1);
        }
      } catch (err: any) {
        console.error('Error:', err.message);
        process.exit(1);
      }
      break;
    }

    case 'list': {
      let status: string | undefined;
      let client: string | undefined;

      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--status') status = args[++i];
        else if (args[i] === '--client') client = args[++i];
      }

      const result = await list_proposals({ status: status as any, client });

      if (!result.success || !result.data) {
        console.error('Error:', result.error);
        process.exit(1);
      }

      if (result.data.proposals.length === 0) {
        console.log('No proposals found.');
        break;
      }

      console.log(`Proposals (${result.data.total} total):\n`);
      for (const p of result.data.proposals) {
        const value = p.totalValue > 0 ? ` | $${p.totalValue.toLocaleString()}` : '';
        console.log(`  ${p.id.slice(0, 8)}  [${p.status.padEnd(8)}]  ${p.title}  (${p.clientName})${value}`);
      }
      break;
    }

    case 'get': {
      const id = args[1];
      if (!id) {
        console.error('Error: Proposal ID required');
        process.exit(1);
      }

      const result = await get_proposal({ id });

      if (!result.success || !result.data) {
        console.error('Error:', result.error);
        process.exit(1);
      }

      const p = result.data;
      console.log(`\nProposal: ${p.title}`);
      console.log(`ID:       ${p.id}`);
      console.log(`Client:   ${p.clientName}${p.clientCompany ? ` (${p.clientCompany})` : ''}`);
      console.log(`Status:   ${p.status}`);
      console.log(`Value:    $${p.totalValue.toLocaleString()}`);
      console.log(`Template: ${p.templateId}`);
      console.log(`Created:  ${p.createdAt}`);
      console.log(`Updated:  ${p.updatedAt}`);
      console.log(`\nSections: ${p.proposal.sections.map(s => s.title).join(', ')}`);
      break;
    }

    case 'status': {
      const id = args[1];
      const newStatus = args[2];
      if (!id || !newStatus) {
        console.error('Error: Proposal ID and new status required');
        console.log('Usage: purprose status <id> <new-status> [--notes "reason"]');
        process.exit(1);
      }

      let notes: string | undefined;
      for (let i = 3; i < args.length; i++) {
        if (args[i] === '--notes') notes = args[++i];
      }

      const result = await update_proposal_status({ id, status: newStatus, notes });

      if (!result.success || !result.data) {
        console.error('Error:', result.error);
        process.exit(1);
      }

      console.log(`Updated: ${result.data.title} → ${result.data.status}`);
      break;
    }

    case 'delete': {
      const id = args[1];
      if (!id) {
        console.error('Error: Proposal ID required');
        process.exit(1);
      }

      const result = await delete_proposal({ id });

      if (!result.success) {
        console.error('Error:', result.error);
        process.exit(1);
      }

      console.log(`Deleted proposal: ${id}`);
      break;
    }

    case 'migrate': {
      const subcommand = args[1];
      const status = getMigrationStatus();

      if (subcommand === 'status') {
        console.log(`\nMigration Status`);
        console.log(`Current version: ${status.currentVersion}`);
        console.log(`Pending: ${status.pendingCount}\n`);
        for (const m of status.migrations) {
          const marker = m.applied ? '[applied]' : '[pending]';
          console.log(`  ${String(m.version).padStart(3, '0')}  ${marker}  ${m.name}`);
        }
      } else {
        if (status.pendingCount === 0) {
          console.log('All migrations are up to date.');
        } else {
          console.log(`Applied ${status.pendingCount} migration(s). Current version: ${status.currentVersion}`);
          for (const m of status.migrations) {
            if (m.applied) {
              console.log(`  ${String(m.version).padStart(3, '0')}  ${m.name}`);
            }
          }
        }
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch(console.error);
