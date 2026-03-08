import { z } from 'zod';

// Proposal section schema
export const ProposalSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  type: z.enum(['text', 'list', 'table', 'timeline']).default('text'),
});
export type ProposalSection = z.infer<typeof ProposalSectionSchema>;

// Investment/pricing item
export const InvestmentItemSchema = z.object({
  item: z.string(),
  description: z.string().optional(),
  amount: z.number(),
  recurring: z.boolean().default(false),
  frequency: z.enum(['one-time', 'monthly', 'quarterly', 'yearly']).default('one-time'),
});
export type InvestmentItem = z.infer<typeof InvestmentItemSchema>;

// Payment terms
export const PaymentTermsSchema = z.object({
  structure: z.enum(['upfront', '50-50', 'milestone', 'custom']).default('50-50'),
  deposit: z.number().optional(),
  milestones: z.array(z.object({
    description: z.string(),
    percentage: z.number(),
  })).optional(),
  notes: z.string().optional(),
});
export type PaymentTerms = z.infer<typeof PaymentTermsSchema>;

// Style configuration (user-provided, not baked in)
export const StyleConfigSchema = z.object({
  primaryColor: z.string().default('#000000'),
  secondaryColor: z.string().default('#444444'),
  accentColor: z.string().default('#0066cc'),
  fontFamily: z.string().default('system-ui, sans-serif'),
  fontSize: z.number().default(14),
  headerFont: z.string().optional(),
  logoUrl: z.string().optional(),
  footerText: z.string().optional(),
});
export type StyleConfig = z.infer<typeof StyleConfigSchema>;

// Full proposal schema
export const ProposalSchema = z.object({
  // Header
  title: z.string(),
  subtitle: z.string().optional(),
  clientName: z.string(),
  clientCompany: z.string().optional(),
  preparedBy: z.string(),
  preparedByTitle: z.string().optional(),
  date: z.string(),
  validUntil: z.string().optional(),
  
  // Content sections
  sections: z.array(ProposalSectionSchema),
  
  // Investment
  investment: z.array(InvestmentItemSchema),
  paymentTerms: PaymentTermsSchema,
  
  // Styling (user config, no defaults with private data)
  style: StyleConfigSchema.optional(),
  
  // Timeline
  startDate: z.string().optional(),
  estimatedDuration: z.string().optional(),
  
  // Footer
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  paymentMethods: z.string().optional(),
});
export type Proposal = z.infer<typeof ProposalSchema>;

// Generate request
export const GenerateProposalRequestSchema = z.object({
  proposal: ProposalSchema,
  outputFormat: z.enum(['html', 'pdf']).default('html'),
  templateId: z.string().default('default'),
});
export type GenerateProposalRequest = z.infer<typeof GenerateProposalRequestSchema>;

// Proposal status lifecycle
export const ProposalStatusSchema = z.enum([
  'draft', 'internal_review', 'reviewed', 'sent', 'viewed',
  'revision_requested', 'approved', 'rejected', 'won', 'lost', 'archived',
]);
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

// Stored proposal (wraps Proposal with persistence metadata)
export interface StoredProposal {
  id: string;
  title: string;
  clientName: string;
  clientCompany?: string;
  preparedBy: string;
  status: ProposalStatus;
  totalValue: number;
  proposal: Proposal;
  templateId: string;
  createdAt: string;
  updatedAt: string;
}

// Status history entry
export interface StatusHistoryEntry {
  id: number;
  proposalId: string;
  fromStatus: string | null;
  toStatus: string;
  notes: string | null;
  changedAt: string;
}

// Filters for listing proposals
export interface ProposalFilters {
  status?: ProposalStatus;
  client?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

// CRM context for alignment checks
export const CrmContextSchema = z.object({
  opportunityName: z.string().optional(),
  dealStage: z.string().optional(),
  dealValue: z.number().optional(),
  contactName: z.string().optional(),
  contactTitle: z.string().optional(),
  companyName: z.string().optional(),
  closeDate: z.string().optional(),
  notes: z.string().optional(),
  customFields: z.record(z.string()).optional(),
});
export type CrmContext = z.infer<typeof CrmContextSchema>;

// Tool response
export interface ToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
