#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  generate_proposal,
  validate_proposal,
  draft_proposal,
  add_section,
  update_investment,
  list_templates,
} from './handlers.js';

const server = new Server(
  {
    name: 'purprose',
    version: '0.1.0',
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
    description: 'Generate a proposal as HTML (or PDF). Provide full proposal data and get formatted output.',
    inputSchema: {
      type: 'object',
      properties: {
        proposal: {
          type: 'object',
          description: 'Full proposal data including title, client, sections, investment, etc.',
          properties: {
            title: { type: 'string', description: 'Proposal title' },
            subtitle: { type: 'string', description: 'Optional subtitle' },
            clientName: { type: 'string', description: 'Client name' },
            clientCompany: { type: 'string', description: 'Client company' },
            preparedBy: { type: 'string', description: 'Your name' },
            preparedByTitle: { type: 'string', description: 'Your title' },
            date: { type: 'string', description: 'Proposal date (YYYY-MM-DD)' },
            validUntil: { type: 'string', description: 'Expiration date' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  content: { type: 'string' },
                  type: { type: 'string', enum: ['text', 'list', 'table', 'timeline'] },
                },
              },
            },
            investment: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item: { type: 'string' },
                  description: { type: 'string' },
                  amount: { type: 'number' },
                  recurring: { type: 'boolean' },
                  frequency: { type: 'string', enum: ['one-time', 'monthly', 'quarterly', 'yearly'] },
                },
              },
            },
            paymentTerms: {
              type: 'object',
              properties: {
                structure: { type: 'string', enum: ['upfront', '50-50', 'milestone', 'custom'] },
                deposit: { type: 'number' },
                notes: { type: 'string' },
              },
            },
            style: {
              type: 'object',
              description: 'Custom styling (colors, fonts, logo URL)',
              properties: {
                primaryColor: { type: 'string' },
                secondaryColor: { type: 'string' },
                accentColor: { type: 'string' },
                fontFamily: { type: 'string' },
                fontSize: { type: 'number' },
                logoUrl: { type: 'string' },
                footerText: { type: 'string' },
              },
            },
          },
          required: ['title', 'clientName', 'preparedBy', 'date', 'sections', 'investment', 'paymentTerms'],
        },
        outputFormat: { type: 'string', enum: ['html', 'pdf'], default: 'html' },
        templateId: { type: 'string', default: 'default' },
      },
      required: ['proposal'],
    },
  },
  {
    name: 'validate_proposal',
    description: 'Validate proposal data structure. Returns validation errors if any.',
    inputSchema: {
      type: 'object',
      properties: {
        proposal: { type: 'object', description: 'Proposal data to validate' },
      },
      required: ['proposal'],
    },
  },
  {
    name: 'draft_proposal',
    description: 'Create a proposal draft from minimal input. Returns a proposal structure you can refine.',
    inputSchema: {
      type: 'object',
      properties: {
        clientName: { type: 'string', description: 'Client name' },
        projectDescription: { type: 'string', description: 'What the project is about' },
        estimatedBudget: { type: 'number', description: 'Estimated total budget' },
        preparedBy: { type: 'string', description: 'Your name' },
        style: { type: 'object', description: 'Optional style overrides' },
      },
      required: ['clientName', 'projectDescription', 'preparedBy'],
    },
  },
  {
    name: 'add_section',
    description: 'Add a new section to an existing proposal.',
    inputSchema: {
      type: 'object',
      properties: {
        proposal: { type: 'object', description: 'Current proposal' },
        title: { type: 'string', description: 'Section title' },
        content: { type: 'string', description: 'Section content' },
        type: { type: 'string', enum: ['text', 'list', 'table', 'timeline'], default: 'text' },
        position: { type: 'number', description: 'Insert position (0-indexed). Omit to append.' },
      },
      required: ['proposal', 'title', 'content'],
    },
  },
  {
    name: 'update_investment',
    description: 'Update the investment/pricing section of a proposal.',
    inputSchema: {
      type: 'object',
      properties: {
        proposal: { type: 'object', description: 'Current proposal' },
        items: {
          type: 'array',
          description: 'New investment items',
          items: {
            type: 'object',
            properties: {
              item: { type: 'string' },
              description: { type: 'string' },
              amount: { type: 'number' },
              recurring: { type: 'boolean' },
              frequency: { type: 'string', enum: ['one-time', 'monthly', 'quarterly', 'yearly'] },
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
    description: 'List available proposal templates.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  let result: any;

  switch (name) {
    case 'generate_proposal':
      result = await generate_proposal(args as any);
      break;
    case 'validate_proposal':
      result = await validate_proposal(args?.proposal);
      break;
    case 'draft_proposal':
      result = await draft_proposal(args as any);
      break;
    case 'add_section':
      result = await add_section(args as any);
      break;
    case 'update_investment':
      result = await update_investment(args as any);
      break;
    case 'list_templates':
      result = await list_templates();
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
