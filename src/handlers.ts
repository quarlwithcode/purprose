import {
  Proposal,
  ProposalSchema,
  ProposalStatus,
  ProposalStatusSchema,
  GenerateProposalRequest,
  StyleConfig,
  StoredProposal,
  StatusHistoryEntry,
  ProposalFilters,
  CrmContext,
  CrmContextSchema,
  ToolResponse,
} from './types.js';
import { renderProposal } from './templates.js';
import {
  saveProposal as dbSave,
  getProposal as dbGet,
  listProposals as dbList,
  updateProposal as dbUpdate,
  cloneProposal as dbClone,
  updateProposalStatus as dbUpdateStatus,
  deleteProposal as dbDelete,
  getProposalHistory as dbHistory,
  getPipelineSummary,
} from './db.js';
import { isPuppeteerAvailable, htmlToPdf } from './pdf.js';

// Generate proposal HTML (with optional save and PDF)
export async function generate_proposal(
  request: GenerateProposalRequest & { save?: boolean }
): Promise<ToolResponse<{ html?: string; pdf?: string; format?: string; id?: string; note?: string }>> {
  try {
    const proposal = ProposalSchema.parse(request.proposal);
    const html = renderProposal(proposal, request.templateId);

    let savedId: string | undefined;
    if (request.save) {
      const stored = dbSave(proposal, request.templateId);
      savedId = stored.id;
    }

    if (request.outputFormat === 'pdf') {
      const available = await isPuppeteerAvailable();
      if (available) {
        const pdfBuffer = await htmlToPdf(html);
        return {
          success: true,
          data: {
            pdf: pdfBuffer.toString('base64'),
            format: 'pdf',
            id: savedId,
          },
        };
      }
      return {
        success: true,
        data: {
          html,
          id: savedId,
          note: 'PDF output requires puppeteer. Install with: npm install puppeteer. Returning HTML instead.',
        },
      };
    }

    return {
      success: true,
      data: { html, id: savedId },
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
  const now = new Date();
  const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

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
  return {
    success: true,
    data: ['default', 'minimal', 'professional'],
  };
}

// --- Phase 1: Proposal lifecycle ---

export async function save_proposal(input: {
  proposal: unknown;
  templateId?: string;
  status?: string;
}): Promise<ToolResponse<StoredProposal>> {
  try {
    const proposal = ProposalSchema.parse(input.proposal);
    const status = input.status ? ProposalStatusSchema.parse(input.status) : 'draft';
    const stored = dbSave(proposal, input.templateId || 'default', status);
    return { success: true, data: stored };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid proposal data',
    };
  }
}

export async function get_proposal(input: {
  id: string;
}): Promise<ToolResponse<StoredProposal>> {
  const stored = dbGet(input.id);
  if (!stored) {
    return { success: false, error: `Proposal not found: ${input.id}` };
  }
  return { success: true, data: stored };
}

export async function list_proposals(
  filters: ProposalFilters = {}
): Promise<ToolResponse<{ proposals: StoredProposal[]; total: number }>> {
  try {
    if (filters.status) {
      ProposalStatusSchema.parse(filters.status);
    }
    const result = dbList(filters);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid filter parameters',
    };
  }
}

export async function update_proposal_status(input: {
  id: string;
  status: string;
  notes?: string;
}): Promise<ToolResponse<StoredProposal>> {
  try {
    const status = ProposalStatusSchema.parse(input.status);
    const stored = dbUpdateStatus(input.id, status, input.notes);
    if (!stored) {
      return { success: false, error: `Proposal not found: ${input.id}` };
    }
    return { success: true, data: stored };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid status',
    };
  }
}

export async function update_proposal(input: {
  id: string;
  proposal: unknown;
  templateId?: string;
}): Promise<ToolResponse<StoredProposal>> {
  try {
    const proposal = ProposalSchema.parse(input.proposal);
    const stored = dbUpdate(input.id, proposal, input.templateId);
    if (!stored) {
      return { success: false, error: `Proposal not found: ${input.id}` };
    }
    return { success: true, data: stored };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid proposal data',
    };
  }
}

export async function clone_proposal(input: {
  id: string;
  newClientName?: string;
  newTitle?: string;
  newClientCompany?: string;
}): Promise<ToolResponse<StoredProposal>> {
  const stored = dbClone(input.id, {
    newClientName: input.newClientName,
    newTitle: input.newTitle,
    newClientCompany: input.newClientCompany,
  });
  if (!stored) {
    return { success: false, error: `Proposal not found: ${input.id}` };
  }
  return { success: true, data: stored };
}

export async function delete_proposal(input: {
  id: string;
}): Promise<ToolResponse<{ deleted: boolean }>> {
  const deleted = dbDelete(input.id);
  if (!deleted) {
    return { success: false, error: `Proposal not found: ${input.id}` };
  }
  return { success: true, data: { deleted: true } };
}

// --- Phase 3: Pipeline analytics ---

export async function pipeline_report(
  filters: { dateFrom?: string; dateTo?: string; client?: string } = {}
): Promise<ToolResponse<ReturnType<typeof getPipelineSummary>>> {
  try {
    const summary = getPipelineSummary(filters);
    return { success: true, data: summary };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate pipeline report',
    };
  }
}

export async function proposal_history(input: {
  id: string;
}): Promise<ToolResponse<{ proposalId: string; history: StatusHistoryEntry[] }>> {
  const stored = dbGet(input.id);
  if (!stored) {
    return { success: false, error: `Proposal not found: ${input.id}` };
  }
  const history = dbHistory(input.id);
  return { success: true, data: { proposalId: input.id, history } };
}

// --- Phase 4: CRM alignment ---

export async function check_crm_alignment(input: {
  proposal?: unknown;
  id?: string;
  crmContext: unknown;
}): Promise<ToolResponse<{
  clientNameMatch: boolean;
  valueAlignment: { delta: number; percentage: number } | null;
  stageAlignment: { proposalStatus: string; crmStage: string; suggestion?: string } | null;
  dateAlignment: { proposalDate?: string; crmCloseDate?: string; aligned: boolean } | null;
  gaps: string[];
  suggestions: string[];
}>> {
  try {
    const crm = CrmContextSchema.parse(input.crmContext);

    let proposal: Proposal;
    let proposalStatus: ProposalStatus = 'draft';

    if (input.id) {
      const stored = dbGet(input.id);
      if (!stored) {
        return { success: false, error: `Proposal not found: ${input.id}` };
      }
      proposal = stored.proposal;
      proposalStatus = stored.status;
    } else if (input.proposal) {
      proposal = ProposalSchema.parse(input.proposal);
    } else {
      return { success: false, error: 'Provide either proposal data or an id' };
    }

    const totalValue = proposal.investment.reduce((sum, item) => sum + item.amount, 0);
    const gaps: string[] = [];
    const suggestions: string[] = [];

    // Client name match
    const clientNameMatch = crm.companyName
      ? proposal.clientName.toLowerCase().includes(crm.companyName.toLowerCase()) ||
        crm.companyName.toLowerCase().includes(proposal.clientName.toLowerCase())
      : crm.contactName
        ? proposal.clientName.toLowerCase().includes(crm.contactName.toLowerCase())
        : true;

    if (!clientNameMatch) {
      gaps.push(`Client name mismatch: proposal has "${proposal.clientName}", CRM has "${crm.companyName || crm.contactName}"`);
      suggestions.push('Consider aligning the client name between proposal and CRM');
    }

    // Value alignment
    let valueAlignment: { delta: number; percentage: number } | null = null;
    if (crm.dealValue !== undefined) {
      const delta = totalValue - crm.dealValue;
      const percentage = crm.dealValue > 0 ? Math.round((delta / crm.dealValue) * 100) : 0;
      valueAlignment = { delta, percentage };
      if (Math.abs(percentage) > 10) {
        gaps.push(`Value mismatch: proposal total is $${totalValue}, CRM deal value is $${crm.dealValue} (${percentage > 0 ? '+' : ''}${percentage}%)`);
        suggestions.push('Consider matching proposal value to CRM deal value');
      }
    }

    // Stage alignment
    const stageMap: Record<string, ProposalStatus[]> = {
      'prospecting': ['draft'],
      'qualification': ['draft', 'reviewed'],
      'proposal': ['sent'],
      'negotiation': ['sent', 'approved'],
      'closed won': ['won'],
      'closed lost': ['lost'],
    };

    let stageAlignment: { proposalStatus: string; crmStage: string; suggestion?: string } | null = null;
    if (crm.dealStage) {
      const normalizedStage = crm.dealStage.toLowerCase();
      const expectedStatuses = stageMap[normalizedStage];
      const aligned = expectedStatuses ? expectedStatuses.includes(proposalStatus) : true;

      stageAlignment = {
        proposalStatus,
        crmStage: crm.dealStage,
        suggestion: aligned ? undefined : `CRM stage "${crm.dealStage}" typically maps to proposal status [${expectedStatuses?.join(', ')}], but proposal is "${proposalStatus}"`,
      };

      if (!aligned && stageAlignment.suggestion) {
        gaps.push(stageAlignment.suggestion);
      }
    }

    // Date alignment
    let dateAlignment: { proposalDate?: string; crmCloseDate?: string; aligned: boolean } | null = null;
    if (crm.closeDate) {
      dateAlignment = {
        proposalDate: proposal.validUntil || proposal.date,
        crmCloseDate: crm.closeDate,
        aligned: true,
      };

      if (proposal.validUntil && new Date(proposal.validUntil) < new Date(crm.closeDate)) {
        dateAlignment.aligned = false;
        gaps.push(`Proposal expires (${proposal.validUntil}) before CRM close date (${crm.closeDate})`);
        suggestions.push('Extend proposal validity to cover the CRM close date');
      }
    }

    // Check for missing fields
    if (crm.contactTitle && !proposal.preparedByTitle) {
      gaps.push('Proposal missing contact title from CRM');
    }
    if (crm.companyName && !proposal.clientCompany) {
      gaps.push('Proposal missing client company from CRM');
      suggestions.push(`Add client company "${crm.companyName}" to proposal`);
    }

    return {
      success: true,
      data: {
        clientNameMatch,
        valueAlignment,
        stageAlignment,
        dateAlignment,
        gaps,
        suggestions,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid input',
    };
  }
}
