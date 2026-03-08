import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import {
  Proposal,
  ProposalSchema,
  GenerateProposalRequest,
  StyleConfig,
  ToolResponse,
} from './types.js';
import { renderProposal } from './templates.js';

// Generate proposal HTML/PDF
export async function generate_proposal(
  request: GenerateProposalRequest
): Promise<ToolResponse<{ html: string; filePath?: string }>> {
  try {
    // Validate proposal data
    const proposal = ProposalSchema.parse(request.proposal);
    
    // Render to HTML
    const html = renderProposal(proposal);
    
    if (request.outputFormat === 'pdf') {
      // PDF generation requires puppeteer
      // Return HTML with instructions for PDF conversion
      return {
        success: true,
        data: {
          html,
          filePath: undefined,
        },
        error: 'PDF generation requires puppeteer. Use html output and convert with browser print.',
      };
    }
    
    return {
      success: true,
      data: { html },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Validate proposal structure
export async function validate_proposal(
  proposal: unknown
): Promise<ToolResponse<{ valid: boolean; errors?: string[] }>> {
  try {
    ProposalSchema.parse(proposal);
    return {
      success: true,
      data: { valid: true },
    };
  } catch (error: any) {
    const errors = error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`) || [];
    return {
      success: true,
      data: { valid: false, errors },
    };
  }
}

// Create proposal from natural language description
export async function draft_proposal(input: {
  clientName: string;
  projectDescription: string;
  estimatedBudget?: number;
  preparedBy: string;
  style?: Partial<StyleConfig>;
}): Promise<ToolResponse<Proposal>> {
  // Create a basic proposal structure from inputs
  // Agent can then refine this
  const now = new Date();
  const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  const proposal: Proposal = {
    title: `Proposal for ${input.clientName}`,
    clientName: input.clientName,
    preparedBy: input.preparedBy,
    date: now.toISOString().split('T')[0],
    validUntil: validUntil.toISOString().split('T')[0],
    sections: [
      {
        title: 'Project Overview',
        content: input.projectDescription,
        type: 'text',
      },
      {
        title: 'Scope of Work',
        content: 'To be defined based on project requirements.',
        type: 'text',
      },
      {
        title: 'Deliverables',
        content: 'Deliverables will be outlined upon scope finalization.',
        type: 'list',
      },
    ],
    investment: input.estimatedBudget ? [
      {
        item: 'Project Total',
        description: 'As described in scope',
        amount: input.estimatedBudget,
        recurring: false,
        frequency: 'one-time',
      },
    ] : [],
    paymentTerms: {
      structure: '50-50',
    },
    style: input.style as any,
  };
  
  return {
    success: true,
    data: proposal,
  };
}

// Add section to proposal
export async function add_section(input: {
  proposal: Proposal;
  title: string;
  content: string;
  type?: 'text' | 'list' | 'table' | 'timeline';
  position?: number;
}): Promise<ToolResponse<Proposal>> {
  const newSection = {
    title: input.title,
    content: input.content,
    type: input.type || 'text',
  };
  
  const sections = [...input.proposal.sections];
  if (input.position !== undefined && input.position >= 0) {
    sections.splice(input.position, 0, newSection);
  } else {
    sections.push(newSection);
  }
  
  return {
    success: true,
    data: {
      ...input.proposal,
      sections,
    },
  };
}

// Update investment items
export async function update_investment(input: {
  proposal: Proposal;
  items: Array<{
    item: string;
    description?: string;
    amount: number;
    recurring?: boolean;
    frequency?: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
  }>;
}): Promise<ToolResponse<Proposal>> {
  return {
    success: true,
    data: {
      ...input.proposal,
      investment: input.items.map(item => ({
        ...item,
        recurring: item.recurring || false,
        frequency: item.frequency || 'one-time',
      })),
    },
  };
}

// List available templates
export async function list_templates(): Promise<ToolResponse<string[]>> {
  // Templates are loaded at runtime from user config
  // This returns the built-in template IDs
  return {
    success: true,
    data: ['default', 'minimal', 'professional'],
  };
}
