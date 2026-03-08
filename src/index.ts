#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import {
  generate_proposal,
  validate_proposal,
  draft_proposal,
  add_section,
  update_investment,
  list_templates,
  save_proposal,
  get_proposal,
  list_proposals,
  update_proposal_status,
  delete_proposal,
  pipeline_report,
  proposal_history,
  check_crm_alignment,
} from './handlers.js';
import { GenerateProposalRequest, Proposal, StyleConfig, ProposalFilters } from './types.js';

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(await readFile(join(__dirname, '..', 'package.json'), 'utf-8'));

const server = new Server(
  {
    name: 'purprose',
    version: pkg.version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: 'generate_proposal',
    description: 'Generate a proposal as HTML or PDF. Provide full proposal data and get formatted output.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        proposal: {
          type: 'object' as const,
          description: 'Full proposal data including title, client, sections, investment, etc.',
          properties: {
            title: { type: 'string' as const, description: 'Proposal title' },
            subtitle: { type: 'string' as const, description: 'Optional subtitle' },
            clientName: { type: 'string' as const, description: 'Client name' },
            clientCompany: { type: 'string' as const, description: 'Client company' },
            preparedBy: { type: 'string' as const, description: 'Your name' },
            preparedByTitle: { type: 'string' as const, description: 'Your title' },
            date: { type: 'string' as const, description: 'Proposal date (YYYY-MM-DD)' },
            validUntil: { type: 'string' as const, description: 'Expiration date' },
            sections: {
              type: 'array' as const,
              items: {
                type: 'object' as const,
                properties: {
                  title: { type: 'string' as const },
                  content: { type: 'string' as const },
                  type: { type: 'string' as const, enum: ['text', 'list', 'table', 'timeline'] },
                },
              },
            },
            investment: {
              type: 'array' as const,
              items: {
                type: 'object' as const,
                properties: {
                  item: { type: 'string' as const },
                  description: { type: 'string' as const },
                  amount: { type: 'number' as const },
                  recurring: { type: 'boolean' as const },
                  frequency: { type: 'string' as const, enum: ['one-time', 'monthly', 'quarterly', 'yearly'] },
                },
              },
            },
            paymentTerms: {
              type: 'object' as const,
              properties: {
                structure: { type: 'string' as const, enum: ['upfront', '50-50', 'milestone', 'custom'] },
                deposit: { type: 'number' as const },
                notes: { type: 'string' as const },
              },
            },
            style: {
              type: 'object' as const,
              description: 'Custom styling (colors, fonts, logo URL)',
              properties: {
                primaryColor: { type: 'string' as const },
                secondaryColor: { type: 'string' as const },
                accentColor: { type: 'string' as const },
                fontFamily: { type: 'string' as const },
                fontSize: { type: 'number' as const },
                logoUrl: { type: 'string' as const },
                footerText: { type: 'string' as const },
              },
            },
          },
          required: ['title', 'clientName', 'preparedBy', 'date', 'sections', 'investment', 'paymentTerms'],
        },
        outputFormat: { type: 'string' as const, enum: ['html', 'pdf'], default: 'html' },
        templateId: { type: 'string' as const, enum: ['default', 'minimal', 'professional'], default: 'default' },
        save: { type: 'boolean' as const, description: 'Save proposal to database after generation', default: false },
      },
      required: ['proposal'],
    },
  },
  {
    name: 'validate_proposal',
    description: 'Validate proposal data structure. Returns validation errors if any.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        proposal: { type: 'object' as const, description: 'Proposal data to validate' },
      },
      required: ['proposal'],
    },
  },
  {
    name: 'draft_proposal',
    description: 'Create a proposal draft from minimal input. Returns a proposal structure you can refine.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        clientName: { type: 'string' as const, description: 'Client name' },
        projectDescription: { type: 'string' as const, description: 'What the project is about' },
        estimatedBudget: { type: 'number' as const, description: 'Estimated total budget' },
        preparedBy: { type: 'string' as const, description: 'Your name' },
        style: { type: 'object' as const, description: 'Optional style overrides' },
      },
      required: ['clientName', 'projectDescription', 'preparedBy'],
    },
  },
  {
    name: 'add_section',
    description: 'Add a new section to an existing proposal.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        proposal: { type: 'object' as const, description: 'Current proposal' },
        title: { type: 'string' as const, description: 'Section title' },
        content: { type: 'string' as const, description: 'Section content' },
        type: { type: 'string' as const, enum: ['text', 'list', 'table', 'timeline'], default: 'text' },
        position: { type: 'number' as const, description: 'Insert position (0-indexed). Omit to append.' },
      },
      required: ['proposal', 'title', 'content'],
    },
  },
  {
    name: 'update_investment',
    description: 'Update the investment/pricing section of a proposal.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        proposal: { type: 'object' as const, description: 'Current proposal' },
        items: {
          type: 'array' as const,
          description: 'New investment items',
          items: {
            type: 'object' as const,
            properties: {
              item: { type: 'string' as const },
              description: { type: 'string' as const },
              amount: { type: 'number' as const },
              recurring: { type: 'boolean' as const },
              frequency: { type: 'string' as const, enum: ['one-time', 'monthly', 'quarterly', 'yearly'] },
            },
            required: ['item', 'amount'],
          },
        },
      },
      required: ['proposal', 'items'],
    },
  },
  {
    name: 'list_templates',
    description: 'List available proposal templates: default, minimal, professional.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  // Phase 1: Proposal lifecycle tools
  {
    name: 'save_proposal',
    description: 'Save a proposal to the database for tracking and lifecycle management.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        proposal: { type: 'object' as const, description: 'Full proposal data to save' },
        templateId: { type: 'string' as const, enum: ['default', 'minimal', 'professional'], default: 'default' },
        status: { type: 'string' as const, enum: ['draft', 'reviewed', 'sent', 'approved', 'won', 'lost'], default: 'draft' },
      },
      required: ['proposal'],
    },
  },
  {
    name: 'get_proposal',
    description: 'Retrieve a saved proposal by its UUID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const, description: 'Proposal UUID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_proposals',
    description: 'List saved proposals with optional filters.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string' as const, enum: ['draft', 'reviewed', 'sent', 'approved', 'won', 'lost'], description: 'Filter by status' },
        client: { type: 'string' as const, description: 'Filter by client name (partial match)' },
        dateFrom: { type: 'string' as const, description: 'Filter from date (ISO 8601)' },
        dateTo: { type: 'string' as const, description: 'Filter to date (ISO 8601)' },
        limit: { type: 'number' as const, description: 'Max results (default 50)' },
        offset: { type: 'number' as const, description: 'Offset for pagination' },
      },
    },
  },
  {
    name: 'update_proposal_status',
    description: 'Update the status of a saved proposal (draft → reviewed → sent → approved → won/lost).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const, description: 'Proposal UUID' },
        status: { type: 'string' as const, enum: ['draft', 'reviewed', 'sent', 'approved', 'won', 'lost'], description: 'New status' },
        notes: { type: 'string' as const, description: 'Optional notes about the status change' },
      },
      required: ['id', 'status'],
    },
  },
  {
    name: 'delete_proposal',
    description: 'Delete a saved proposal and its history.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const, description: 'Proposal UUID' },
      },
      required: ['id'],
    },
  },
  // Phase 3: Analytics tools
  {
    name: 'pipeline_report',
    description: 'Generate a pipeline analytics report: proposal counts/values by status, win/loss rates, weighted pipeline value, top clients.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        dateFrom: { type: 'string' as const, description: 'Filter from date (ISO 8601)' },
        dateTo: { type: 'string' as const, description: 'Filter to date (ISO 8601)' },
        client: { type: 'string' as const, description: 'Filter by client name' },
      },
    },
  },
  {
    name: 'proposal_history',
    description: 'Get the full status change audit trail for a proposal.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const, description: 'Proposal UUID' },
      },
      required: ['id'],
    },
  },
  // Phase 4: CRM alignment
  {
    name: 'check_crm_alignment',
    description: 'Compare a proposal against CRM data to identify gaps and misalignments. No API calls — pure data comparison.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        proposal: { type: 'object' as const, description: 'Proposal data (inline). Provide this OR id.' },
        id: { type: 'string' as const, description: 'Proposal UUID (from database). Provide this OR proposal.' },
        crmContext: {
          type: 'object' as const,
          description: 'CRM data to compare against',
          properties: {
            opportunityName: { type: 'string' as const },
            dealStage: { type: 'string' as const, description: 'CRM deal stage (e.g., prospecting, qualification, proposal, negotiation, closed won, closed lost)' },
            dealValue: { type: 'number' as const },
            contactName: { type: 'string' as const },
            contactTitle: { type: 'string' as const },
            companyName: { type: 'string' as const },
            closeDate: { type: 'string' as const },
            notes: { type: 'string' as const },
            customFields: { type: 'object' as const, description: 'Additional CRM fields' },
          },
        },
      },
      required: ['crmContext'],
    },
  },
];

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Type for tool call arguments
type ToolArgs = Record<string, unknown>;

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const toolArgs = args as ToolArgs;
  let result: { success: boolean; data?: unknown; error?: string };

  switch (name) {
    case 'generate_proposal':
      result = await generate_proposal(toolArgs as unknown as GenerateProposalRequest & { save?: boolean });
      break;
    case 'validate_proposal':
      result = await validate_proposal(toolArgs.proposal);
      break;
    case 'draft_proposal':
      result = await draft_proposal(toolArgs as unknown as {
        clientName: string;
        projectDescription: string;
        estimatedBudget?: number;
        preparedBy: string;
        style?: Partial<StyleConfig>;
      });
      break;
    case 'add_section':
      result = await add_section(toolArgs as unknown as {
        proposal: Proposal;
        title: string;
        content: string;
        type?: 'text' | 'list' | 'table' | 'timeline';
        position?: number;
      });
      break;
    case 'update_investment':
      result = await update_investment(toolArgs as unknown as {
        proposal: Proposal;
        items: Array<{
          item: string;
          description?: string;
          amount: number;
          recurring?: boolean;
          frequency?: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
        }>;
      });
      break;
    case 'list_templates':
      result = await list_templates();
      break;
    case 'save_proposal':
      result = await save_proposal(toolArgs as unknown as {
        proposal: unknown;
        templateId?: string;
        status?: string;
      });
      break;
    case 'get_proposal':
      result = await get_proposal(toolArgs as unknown as { id: string });
      break;
    case 'list_proposals':
      result = await list_proposals(toolArgs as unknown as ProposalFilters);
      break;
    case 'update_proposal_status':
      result = await update_proposal_status(toolArgs as unknown as {
        id: string;
        status: string;
        notes?: string;
      });
      break;
    case 'delete_proposal':
      result = await delete_proposal(toolArgs as unknown as { id: string });
      break;
    case 'pipeline_report':
      result = await pipeline_report(toolArgs as unknown as {
        dateFrom?: string;
        dateTo?: string;
        client?: string;
      });
      break;
    case 'proposal_history':
      result = await proposal_history(toolArgs as unknown as { id: string });
      break;
    case 'check_crm_alignment':
      result = await check_crm_alignment(toolArgs as unknown as {
        proposal?: unknown;
        id?: string;
        crmContext: unknown;
      });
      break;
    default:
      result = { success: false, error: `Unknown tool: ${name}` };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
