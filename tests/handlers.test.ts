import { describe, it, expect } from 'vitest';
import {
  generate_proposal,
  validate_proposal,
  draft_proposal,
  add_section,
  update_investment,
  list_templates,
} from '../src/handlers.js';

describe('purprose', () => {
  const baseProposal = {
    title: 'Test Proposal',
    clientName: 'Test Client',
    preparedBy: 'Test Author',
    date: '2026-03-08',
    sections: [
      { title: 'Overview', content: 'Test overview', type: 'text' as const },
    ],
    investment: [
      { item: 'Service', amount: 1000, recurring: false, frequency: 'one-time' as const },
    ],
    paymentTerms: { structure: '50-50' as const },
  };

  describe('generate_proposal', () => {
    it('generates HTML proposal', async () => {
      const result = await generate_proposal({
        proposal: baseProposal,
        outputFormat: 'html',
        templateId: 'default',
      });

      expect(result.success).toBe(true);
      expect(result.data?.html).toContain('<!DOCTYPE html>');
      expect(result.data?.html).toContain('Test Proposal');
      expect(result.data?.html).toContain('Test Client');
    });

    it('includes investment section', async () => {
      const result = await generate_proposal({
        proposal: baseProposal,
        outputFormat: 'html',
        templateId: 'default',
      });

      expect(result.data?.html).toContain('Investment');
      expect(result.data?.html).toContain('$1,000');
    });

    it('includes payment terms', async () => {
      const result = await generate_proposal({
        proposal: baseProposal,
        outputFormat: 'html',
        templateId: 'default',
      });

      expect(result.data?.html).toContain('50%');
      expect(result.data?.html).toContain('deposit');
    });

    it('renders list sections', async () => {
      const proposal = {
        ...baseProposal,
        sections: [
          { title: 'Scope', content: 'Item 1\nItem 2\nItem 3', type: 'list' as const },
        ],
      };

      const result = await generate_proposal({
        proposal,
        outputFormat: 'html',
        templateId: 'default',
      });

      expect(result.data?.html).toContain('<li>Item 1</li>');
      expect(result.data?.html).toContain('<li>Item 2</li>');
    });

    it('applies custom styling', async () => {
      const proposal = {
        ...baseProposal,
        style: {
          primaryColor: '#ff0000',
          fontFamily: 'Arial',
        },
      };

      const result = await generate_proposal({
        proposal,
        outputFormat: 'html',
        templateId: 'default',
      });

      expect(result.data?.html).toContain('#ff0000');
    });
  });

  describe('validate_proposal', () => {
    it('validates correct proposal', async () => {
      const result = await validate_proposal(baseProposal);

      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(true);
    });

    it('invalidates missing title', async () => {
      const { title, ...invalid } = baseProposal;
      const result = await validate_proposal(invalid);

      expect(result.data?.valid).toBe(false);
      expect(result.data?.errors).toBeDefined();
    });

    it('invalidates missing clientName', async () => {
      const { clientName, ...invalid } = baseProposal;
      const result = await validate_proposal(invalid);

      expect(result.data?.valid).toBe(false);
    });
  });

  describe('draft_proposal', () => {
    it('creates draft from minimal input', async () => {
      const result = await draft_proposal({
        clientName: 'Acme Corp',
        projectDescription: 'Build a website',
        preparedBy: 'John Smith',
      });

      expect(result.success).toBe(true);
      expect(result.data?.clientName).toBe('Acme Corp');
      expect(result.data?.title).toContain('Acme Corp');
      expect(result.data?.preparedBy).toBe('John Smith');
      expect(result.data?.sections.length).toBeGreaterThan(0);
    });

    it('includes estimated budget', async () => {
      const result = await draft_proposal({
        clientName: 'Acme Corp',
        projectDescription: 'Build a website',
        estimatedBudget: 5000,
        preparedBy: 'John Smith',
      });

      expect(result.success).toBe(true);
      expect(result.data?.investment[0].amount).toBe(5000);
    });

    it('sets 50-50 payment terms by default', async () => {
      const result = await draft_proposal({
        clientName: 'Test',
        projectDescription: 'Test',
        preparedBy: 'Test',
      });

      expect(result.data?.paymentTerms.structure).toBe('50-50');
    });
  });

  describe('add_section', () => {
    it('adds section at end', async () => {
      const result = await add_section({
        proposal: baseProposal,
        title: 'New Section',
        content: 'New content',
      });

      expect(result.success).toBe(true);
      expect(result.data?.sections.length).toBe(2);
      expect(result.data?.sections[1].title).toBe('New Section');
    });

    it('adds section at position', async () => {
      const result = await add_section({
        proposal: baseProposal,
        title: 'Inserted',
        content: 'Inserted content',
        position: 0,
      });

      expect(result.success).toBe(true);
      expect(result.data?.sections[0].title).toBe('Inserted');
      expect(result.data?.sections[1].title).toBe('Overview');
    });

    it('adds list section', async () => {
      const result = await add_section({
        proposal: baseProposal,
        title: 'Deliverables',
        content: 'Item 1\nItem 2',
        type: 'list',
      });

      expect(result.success).toBe(true);
      expect(result.data?.sections[1].type).toBe('list');
    });
  });

  describe('update_investment', () => {
    it('updates investment items', async () => {
      const result = await update_investment({
        proposal: baseProposal,
        items: [
          { item: 'Design', amount: 500 },
          { item: 'Development', amount: 1500 },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data?.investment.length).toBe(2);
      expect(result.data?.investment[0].item).toBe('Design');
      expect(result.data?.investment[1].amount).toBe(1500);
    });

    it('handles recurring items', async () => {
      const result = await update_investment({
        proposal: baseProposal,
        items: [
          { item: 'Monthly Retainer', amount: 500, recurring: true, frequency: 'monthly' },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data?.investment[0].recurring).toBe(true);
      expect(result.data?.investment[0].frequency).toBe('monthly');
    });
  });

  describe('list_templates', () => {
    it('returns available templates', async () => {
      const result = await list_templates();

      expect(result.success).toBe(true);
      expect(result.data).toContain('default');
    });
  });
});
