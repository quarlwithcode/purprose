#!/usr/bin/env node
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { basename, extname, join } from 'path';
import { generate_proposal, draft_proposal, validate_proposal } from './handlers.js';
import { ProposalSchema } from './types.js';

const HELP = `
purprose — Proposal Generation CLI

USAGE:
  purprose generate <input.json> [--output <file>] [--format html|pdf]
  purprose draft --client <name> --description <text> --budget <amount> --by <preparer>
  purprose validate <input.json>
  purprose help

COMMANDS:
  generate    Generate proposal from JSON input file
  draft       Create draft proposal from basic info
  validate    Validate proposal JSON structure

OPTIONS:
  --output, -o    Output file path (default: proposal.html)
  --format, -f    Output format: html (default), pdf
  --client        Client name (for draft)
  --description   Project description (for draft)
  --budget        Estimated budget (for draft)
  --by            Preparer name (for draft)

EXAMPLES:
  # Generate from JSON
  purprose generate proposal-data.json -o client-proposal.html
  
  # Create draft
  purprose draft --client "Acme Corp" --description "Website redesign" --budget 5000 --by "Your Name"
  
  # Validate structure
  purprose validate proposal-data.json
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

      // Parse options
      let outputFile = 'proposal.html';
      let format = 'html';
      
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--output' || args[i] === '-o') {
          outputFile = args[++i];
        } else if (args[i] === '--format' || args[i] === '-f') {
          format = args[++i];
        }
      }

      try {
        const content = await readFile(inputFile, 'utf-8');
        const proposalData = JSON.parse(content);
        
        const result = await generate_proposal({
          proposal: proposalData,
          outputFormat: format as 'html' | 'pdf',
          templateId: 'default',
        });

        if (!result.success || !result.data) {
          console.error('Error:', result.error);
          process.exit(1);
        }

        await writeFile(outputFile, result.data.html);
        console.log(`✓ Generated: ${outputFile}`);
      } catch (err: any) {
        console.error('Error:', err.message);
        process.exit(1);
      }
      break;
    }

    case 'draft': {
      // Parse options
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
      console.log(`✓ Draft created: ${outputFile}`);
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
          console.log('✓ Valid proposal structure');
        } else {
          console.log('✗ Invalid proposal:');
          result.data?.errors?.forEach(e => console.log(`  - ${e}`));
          process.exit(1);
        }
      } catch (err: any) {
        console.error('Error:', err.message);
        process.exit(1);
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
