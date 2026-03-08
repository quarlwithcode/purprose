import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
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
  update_proposal,
  clone_proposal,
  update_proposal_status,
  delete_proposal,
  pipeline_report,
  proposal_history,
  check_crm_alignment,
} from '../src/handlers.js';
import { initDb, closeDb } from '../src/db.js';

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

    it('returns note for pdf format when puppeteer unavailable', async () => {
      const result = await generate_proposal({
        proposal: baseProposal,
        outputFormat: 'pdf',
        templateId: 'default',
      });

      expect(result.success).toBe(true);
      expect(result.data?.html).toContain('<!DOCTYPE html>');
      expect(result.data?.note).toContain('puppeteer');
      expect(result.error).toBeUndefined();
    });

    it('renders timeline sections', async () => {
      const proposal = {
        ...baseProposal,
        sections: [
          {
            title: 'Timeline',
            content: 'Phase 1: Discovery\nResearch\nInterviews\n\nPhase 2: Design\nWireframes',
            type: 'timeline' as const,
          },
        ],
      };

      const result = await generate_proposal({
        proposal,
        outputFormat: 'html',
        templateId: 'default',
      });

      expect(result.data?.html).toContain('Phase 1: Discovery');
      expect(result.data?.html).toContain('Research');
      expect(result.data?.html).toContain('Phase 2: Design');
      expect(result.data?.html).toContain('Wireframes');
      expect(result.data?.html).toContain('timeline-item');
    });

    it('renders table sections', async () => {
      const proposal = {
        ...baseProposal,
        sections: [
          {
            title: 'Comparison',
            content: 'Feature,Basic,Premium\nPages,5,Unlimited\nSupport,Email,Priority',
            type: 'table' as const,
          },
        ],
      };

      const result = await generate_proposal({
        proposal,
        outputFormat: 'html',
        templateId: 'default',
      });

      expect(result.data?.html).toContain('<th>Feature</th>');
      expect(result.data?.html).toContain('<th>Basic</th>');
      expect(result.data?.html).toContain('<td>Pages</td>');
      expect(result.data?.html).toContain('<td>Unlimited</td>');
      expect(result.data?.html).toContain('section-table');
    });

    it('applies minimal template', async () => {
      const result = await generate_proposal({
        proposal: baseProposal,
        outputFormat: 'html',
        templateId: 'minimal',
      });

      expect(result.success).toBe(true);
      expect(result.data?.html).toContain('40px 60px'); // minimal padding
    });

    it('applies professional template', async () => {
      const result = await generate_proposal({
        proposal: baseProposal,
        outputFormat: 'html',
        templateId: 'professional',
      });

      expect(result.success).toBe(true);
      expect(result.data?.html).toContain('Playfair Display'); // professional serif font
      expect(result.data?.html).toContain('border-left: 4px solid'); // accent bar
    });

    it('escapes HTML in user-provided fields (XSS prevention)', async () => {
      const xssProposal = {
        ...baseProposal,
        title: '<script>alert("xss")</script>',
        clientName: '<img src=x onerror=alert(1)>',
        preparedBy: 'O\'Brien & Associates',
        sections: [
          {
            title: '<b>Injected</b>',
            content: '<script>steal(cookies)</script>',
            type: 'text' as const,
          },
        ],
        investment: [
          {
            item: '<em>Hacked</em>',
            description: '"><script>alert(1)</script>',
            amount: 1000,
            recurring: false,
            frequency: 'one-time' as const,
          },
        ],
      };

      const result = await generate_proposal({
        proposal: xssProposal,
        outputFormat: 'html',
        templateId: 'default',
      });

      const html = result.data?.html || '';

      // Should NOT contain raw HTML tags that could execute
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img src=x');

      // Should contain escaped versions
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(html).toContain('O&#39;Brien &amp; Associates');
      expect(html).toContain('&lt;b&gt;Injected&lt;/b&gt;');
      expect(html).toContain('&lt;em&gt;Hacked&lt;/em&gt;');
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
      expect(result.data).toContain('minimal');
      expect(result.data).toContain('professional');
    });
  });

  // --- Phase 1: Database + Lifecycle tests ---
  describe('proposal lifecycle (database)', () => {
    beforeEach(() => {
      const memDb = new Database(':memory:');
      initDb(memDb);
    });

    afterEach(() => {
      closeDb();
    });

    it('saves and retrieves a proposal', async () => {
      const saveResult = await save_proposal({ proposal: baseProposal });
      expect(saveResult.success).toBe(true);
      expect(saveResult.data?.id).toBeDefined();
      expect(saveResult.data?.status).toBe('draft');
      expect(saveResult.data?.totalValue).toBe(1000);

      const getResult = await get_proposal({ id: saveResult.data!.id });
      expect(getResult.success).toBe(true);
      expect(getResult.data?.title).toBe('Test Proposal');
      expect(getResult.data?.proposal.clientName).toBe('Test Client');
    });

    it('saves with custom status and template', async () => {
      const result = await save_proposal({
        proposal: baseProposal,
        templateId: 'professional',
        status: 'reviewed',
      });
      expect(result.data?.templateId).toBe('professional');
      expect(result.data?.status).toBe('reviewed');
    });

    it('lists proposals with filters', async () => {
      await save_proposal({ proposal: baseProposal, status: 'draft' });
      await save_proposal({
        proposal: { ...baseProposal, title: 'Second Proposal', clientName: 'Other Client' },
        status: 'sent',
      });

      const allResult = await list_proposals({});
      expect(allResult.data?.total).toBe(2);

      const draftResult = await list_proposals({ status: 'draft' });
      expect(draftResult.data?.total).toBe(1);
      expect(draftResult.data?.proposals[0].title).toBe('Test Proposal');

      const clientResult = await list_proposals({ client: 'Other' });
      expect(clientResult.data?.total).toBe(1);
      expect(clientResult.data?.proposals[0].clientName).toBe('Other Client');
    });

    it('updates proposal status with history', async () => {
      const saved = await save_proposal({ proposal: baseProposal });
      const id = saved.data!.id;

      const updated = await update_proposal_status({ id, status: 'sent', notes: 'Emailed to client' });
      expect(updated.success).toBe(true);
      expect(updated.data?.status).toBe('sent');

      const historyResult = await proposal_history({ id });
      expect(historyResult.data?.history.length).toBe(2); // initial + update
      expect(historyResult.data?.history[1].fromStatus).toBe('draft');
      expect(historyResult.data?.history[1].toStatus).toBe('sent');
      expect(historyResult.data?.history[1].notes).toBe('Emailed to client');
    });

    it('deletes proposal with cascaded history', async () => {
      const saved = await save_proposal({ proposal: baseProposal });
      const id = saved.data!.id;

      await update_proposal_status({ id, status: 'sent' });

      const deleteResult = await delete_proposal({ id });
      expect(deleteResult.success).toBe(true);

      const getResult = await get_proposal({ id });
      expect(getResult.success).toBe(false);
    });

    it('returns error for nonexistent proposal', async () => {
      const result = await get_proposal({ id: 'nonexistent-uuid' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns error for invalid status', async () => {
      const saved = await save_proposal({ proposal: baseProposal });
      const result = await update_proposal_status({ id: saved.data!.id, status: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('updates proposal title', async () => {
      const saved = await save_proposal({ proposal: baseProposal });
      const id = saved.data!.id;
      const updatedProposal = { ...baseProposal, title: 'Updated Title' };
      const result = await update_proposal({ id, proposal: updatedProposal });
      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Updated Title');
      expect(result.data?.proposal.title).toBe('Updated Title');
    });

    it('updates proposal sections', async () => {
      const saved = await save_proposal({ proposal: baseProposal });
      const id = saved.data!.id;
      const updatedProposal = {
        ...baseProposal,
        sections: [
          { title: 'New Section', content: 'New content', type: 'text' as const },
          { title: 'Another', content: 'More content', type: 'list' as const },
        ],
      };
      const result = await update_proposal({ id, proposal: updatedProposal });
      expect(result.success).toBe(true);
      expect(result.data?.proposal.sections.length).toBe(2);
      expect(result.data?.proposal.sections[0].title).toBe('New Section');
    });

    it('update recalculates total_value', async () => {
      const saved = await save_proposal({ proposal: baseProposal });
      const id = saved.data!.id;
      expect(saved.data?.totalValue).toBe(1000);
      const updatedProposal = {
        ...baseProposal,
        investment: [
          { item: 'Design', amount: 2000, recurring: false, frequency: 'one-time' as const },
          { item: 'Dev', amount: 3000, recurring: false, frequency: 'one-time' as const },
        ],
      };
      const result = await update_proposal({ id, proposal: updatedProposal });
      expect(result.success).toBe(true);
      expect(result.data?.totalValue).toBe(5000);
    });

    it('update nonexistent ID returns error', async () => {
      const result = await update_proposal({ id: 'nonexistent-uuid', proposal: baseProposal });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('update with invalid proposal data is rejected', async () => {
      const saved = await save_proposal({ proposal: baseProposal });
      const result = await update_proposal({ id: saved.data!.id, proposal: { title: 'missing fields' } });
      expect(result.success).toBe(false);
    });

    it('clones proposal preserving sections and investment', async () => {
      const saved = await save_proposal({ proposal: baseProposal });
      const result = await clone_proposal({ id: saved.data!.id });
      expect(result.success).toBe(true);
      expect(result.data?.proposal.sections.length).toBe(baseProposal.sections.length);
      expect(result.data?.proposal.investment[0].amount).toBe(1000);
      expect(result.data?.totalValue).toBe(1000);
    });

    it('clone applies client and title overrides', async () => {
      const saved = await save_proposal({ proposal: baseProposal });
      const result = await clone_proposal({
        id: saved.data!.id,
        newClientName: 'New Client',
        newTitle: 'New Title',
        newClientCompany: 'New Company',
      });
      expect(result.success).toBe(true);
      expect(result.data?.clientName).toBe('New Client');
      expect(result.data?.title).toBe('New Title');
      expect(result.data?.clientCompany).toBe('New Company');
      expect(result.data?.proposal.clientName).toBe('New Client');
    });

    it('clone resets status to draft', async () => {
      const saved = await save_proposal({ proposal: baseProposal, status: 'sent' });
      const result = await clone_proposal({ id: saved.data!.id });
      expect(result.data?.status).toBe('draft');
    });

    it('clone gets new UUID', async () => {
      const saved = await save_proposal({ proposal: baseProposal });
      const result = await clone_proposal({ id: saved.data!.id });
      expect(result.data?.id).not.toBe(saved.data!.id);
    });

    it('clone leaves original proposal unchanged', async () => {
      const saved = await save_proposal({ proposal: baseProposal });
      await clone_proposal({ id: saved.data!.id, newClientName: 'Different' });
      const original = await get_proposal({ id: saved.data!.id });
      expect(original.data?.clientName).toBe('Test Client');
    });

    it('clone nonexistent ID returns error', async () => {
      const result = await clone_proposal({ id: 'nonexistent-uuid' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('generate_proposal with save=true persists to db', async () => {
      const result = await generate_proposal({
        proposal: baseProposal,
        outputFormat: 'html',
        templateId: 'default',
        save: true,
      });
      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();

      const getResult = await get_proposal({ id: result.data!.id! });
      expect(getResult.success).toBe(true);
      expect(getResult.data?.title).toBe('Test Proposal');
    });
  });

  // --- Phase 3: Pipeline analytics ---
  describe('pipeline analytics', () => {
    beforeEach(() => {
      const memDb = new Database(':memory:');
      initDb(memDb);
    });

    afterEach(() => {
      closeDb();
    });

    it('returns zeroes for empty database', async () => {
      const result = await pipeline_report();
      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(0);
      expect(result.data?.totalActiveValue).toBe(0);
      expect(result.data?.weightedValue).toBe(0);
      expect(result.data?.winLoss.won).toBe(0);
      expect(result.data?.winLoss.lost).toBe(0);
      expect(result.data?.winLoss.winRate).toBe(0);
    });

    it('aggregates pipeline data correctly', async () => {
      await save_proposal({ proposal: baseProposal, status: 'draft' }); // $1000
      await save_proposal({
        proposal: { ...baseProposal, investment: [{ item: 'Big Project', amount: 5000, recurring: false, frequency: 'one-time' as const }] },
        status: 'sent',
      });

      const saved = await save_proposal({
        proposal: { ...baseProposal, investment: [{ item: 'Won Deal', amount: 3000, recurring: false, frequency: 'one-time' as const }] },
        status: 'draft',
      });
      await update_proposal_status({ id: saved.data!.id, status: 'won' });

      const result = await pipeline_report();
      expect(result.data?.total).toBe(3);
      expect(result.data?.byStatus['draft']?.count).toBe(1);
      expect(result.data?.byStatus['sent']?.count).toBe(1);
      expect(result.data?.byStatus['won']?.count).toBe(1);
    });

    it('calculates win rate correctly', async () => {
      // Create 3 won, 1 lost
      for (let i = 0; i < 3; i++) {
        const saved = await save_proposal({ proposal: baseProposal });
        await update_proposal_status({ id: saved.data!.id, status: 'won' });
      }
      const lost = await save_proposal({ proposal: baseProposal });
      await update_proposal_status({ id: lost.data!.id, status: 'lost' });

      const result = await pipeline_report();
      expect(result.data?.winLoss.won).toBe(3);
      expect(result.data?.winLoss.lost).toBe(1);
      expect(result.data?.winLoss.winRate).toBe(75);
    });

    it('reports top clients', async () => {
      await save_proposal({ proposal: baseProposal });
      await save_proposal({ proposal: baseProposal });
      await save_proposal({ proposal: { ...baseProposal, clientName: 'Other Client' } });

      const result = await pipeline_report();
      expect(result.data?.topClients.length).toBe(2);
      expect(result.data?.topClients[0].client).toBe('Test Client');
      expect(result.data?.topClients[0].count).toBe(2);
    });
  });

  // --- Phase 4: CRM alignment ---
  describe('CRM alignment', () => {
    beforeEach(() => {
      const memDb = new Database(':memory:');
      initDb(memDb);
    });

    afterEach(() => {
      closeDb();
    });

    it('detects matching data', async () => {
      const proposalWithCompany = { ...baseProposal, clientCompany: 'Test Client' };
      const result = await check_crm_alignment({
        proposal: proposalWithCompany,
        crmContext: {
          companyName: 'Test Client',
          dealValue: 1000,
        },
      });
      expect(result.success).toBe(true);
      expect(result.data?.clientNameMatch).toBe(true);
      expect(result.data?.valueAlignment?.delta).toBe(0);
      expect(result.data?.gaps.length).toBe(0);
    });

    it('detects client name mismatch', async () => {
      const result = await check_crm_alignment({
        proposal: baseProposal,
        crmContext: {
          companyName: 'Acme Corp',
        },
      });
      expect(result.data?.clientNameMatch).toBe(false);
      expect(result.data?.gaps.length).toBeGreaterThan(0);
    });

    it('detects value mismatch', async () => {
      const result = await check_crm_alignment({
        proposal: baseProposal,
        crmContext: {
          dealValue: 2000,
        },
      });
      expect(result.data?.valueAlignment?.delta).toBe(-1000);
      expect(result.data?.valueAlignment?.percentage).toBe(-50);
      expect(result.data?.gaps.length).toBeGreaterThan(0);
    });

    it('detects missing company in proposal', async () => {
      const result = await check_crm_alignment({
        proposal: baseProposal,
        crmContext: {
          companyName: 'Test Client',
          contactTitle: 'CEO',
        },
      });
      expect(result.data?.gaps).toContain('Proposal missing client company from CRM');
    });

    it('works with stored proposal by id', async () => {
      const saved = await save_proposal({ proposal: baseProposal });
      const result = await check_crm_alignment({
        id: saved.data!.id,
        crmContext: { companyName: 'Test Client', dealValue: 1000 },
      });
      expect(result.success).toBe(true);
      expect(result.data?.clientNameMatch).toBe(true);
    });

    it('returns error when neither proposal nor id provided', async () => {
      const result = await check_crm_alignment({
        crmContext: { companyName: 'Test' },
      });
      expect(result.success).toBe(false);
    });
  });

  // --- Edge cases ---
  describe('edge cases', () => {
    beforeEach(() => {
      const memDb = new Database(':memory:');
      initDb(memDb);
    });

    afterEach(() => {
      closeDb();
    });

    it('handles empty sections', async () => {
      const proposal = { ...baseProposal, sections: [] };
      const result = await generate_proposal({ proposal, outputFormat: 'html', templateId: 'default' });
      expect(result.success).toBe(true);
    });

    it('handles zero-value investment', async () => {
      const proposal = {
        ...baseProposal,
        investment: [{ item: 'Free', amount: 0, recurring: false, frequency: 'one-time' as const }],
      };
      const result = await save_proposal({ proposal });
      expect(result.success).toBe(true);
      expect(result.data?.totalValue).toBe(0);
    });

    it('handles unicode content', async () => {
      const proposal = {
        ...baseProposal,
        title: 'Proposal für Müller GmbH',
        clientName: '株式会社テスト',
        sections: [
          { title: 'Übersicht', content: 'Ñoño y más 日本語テスト', type: 'text' as const },
        ],
      };
      const result = await generate_proposal({ proposal, outputFormat: 'html', templateId: 'default' });
      expect(result.success).toBe(true);
      expect(result.data?.html).toContain('Proposal für Müller GmbH');
      expect(result.data?.html).toContain('株式会社テスト');
    });

    it('handles missing optional fields', async () => {
      const minimalProposal = {
        title: 'Minimal',
        clientName: 'Client',
        preparedBy: 'Author',
        date: '2026-01-01',
        sections: [{ title: 'S', content: 'C', type: 'text' as const }],
        investment: [{ item: 'I', amount: 100 }],
        paymentTerms: {},
      };
      const result = await generate_proposal({ proposal: minimalProposal, outputFormat: 'html', templateId: 'default' });
      expect(result.success).toBe(true);
    });

    it('rejects save with invalid proposal data', async () => {
      const result = await save_proposal({ proposal: { title: 'missing fields' } });
      expect(result.success).toBe(false);
    });

    it('handles pagination in list', async () => {
      for (let i = 0; i < 5; i++) {
        await save_proposal({ proposal: { ...baseProposal, title: `Proposal ${i}` } });
      }

      const page1 = await list_proposals({ limit: 2, offset: 0 });
      expect(page1.data?.proposals.length).toBe(2);
      expect(page1.data?.total).toBe(5);

      const page2 = await list_proposals({ limit: 2, offset: 2 });
      expect(page2.data?.proposals.length).toBe(2);

      const page3 = await list_proposals({ limit: 2, offset: 4 });
      expect(page3.data?.proposals.length).toBe(1);
    });
  });
});
