import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initDb, closeDb } from '../src/db.js';
import {
  draft_proposal,
  save_proposal,
  generate_proposal,
  update_proposal_status,
  pipeline_report,
  proposal_history,
  get_proposal,
  list_proposals,
  delete_proposal,
  check_crm_alignment,
} from '../src/handlers.js';

describe('integration: full proposal lifecycle', () => {
  beforeEach(() => {
    const memDb = new Database(':memory:');
    initDb(memDb);
  });

  afterEach(() => {
    closeDb();
  });

  it('draft → save → update status → generate → pipeline report', async () => {
    // Step 1: Draft a proposal
    const draftResult = await draft_proposal({
      clientName: 'Acme Corp',
      projectDescription: 'Website redesign with modern stack',
      estimatedBudget: 15000,
      preparedBy: 'Jane Smith',
    });
    expect(draftResult.success).toBe(true);
    const proposal = draftResult.data!;

    // Step 2: Save to database
    const saveResult = await save_proposal({ proposal, templateId: 'professional' });
    expect(saveResult.success).toBe(true);
    const id = saveResult.data!.id;
    expect(saveResult.data!.status).toBe('draft');
    expect(saveResult.data!.totalValue).toBe(15000);

    // Step 3: Update status through lifecycle
    const reviewed = await update_proposal_status({ id, status: 'reviewed', notes: 'Reviewed by team' });
    expect(reviewed.data!.status).toBe('reviewed');

    const sent = await update_proposal_status({ id, status: 'sent', notes: 'Sent via email' });
    expect(sent.data!.status).toBe('sent');

    const won = await update_proposal_status({ id, status: 'won', notes: 'Client accepted' });
    expect(won.data!.status).toBe('won');

    // Step 4: Check history
    const history = await proposal_history({ id });
    expect(history.data!.history.length).toBe(4); // draft → reviewed → sent → won

    // Step 5: Generate HTML from stored proposal
    const stored = await get_proposal({ id });
    const genResult = await generate_proposal({
      proposal: stored.data!.proposal,
      outputFormat: 'html',
      templateId: 'professional',
    });
    expect(genResult.success).toBe(true);
    expect(genResult.data!.html).toContain('Acme Corp');
    expect(genResult.data!.html).toContain('$15,000');

    // Step 6: Pipeline report
    const report = await pipeline_report();
    expect(report.data!.total).toBe(1);
    expect(report.data!.winLoss.won).toBe(1);
    expect(report.data!.winLoss.winRate).toBe(100);
    expect(report.data!.topClients[0].client).toBe('Acme Corp');
  });

  it('multi-proposal pipeline with mixed statuses', async () => {
    const proposals = [
      { client: 'Alpha Inc', budget: 5000, status: 'won' },
      { client: 'Beta LLC', budget: 10000, status: 'sent' },
      { client: 'Alpha Inc', budget: 8000, status: 'lost' },
      { client: 'Gamma Co', budget: 20000, status: 'draft' },
    ];

    for (const p of proposals) {
      const draft = await draft_proposal({
        clientName: p.client,
        projectDescription: 'Project',
        estimatedBudget: p.budget,
        preparedBy: 'Author',
      });
      const saved = await save_proposal({ proposal: draft.data! });
      if (p.status !== 'draft') {
        await update_proposal_status({ id: saved.data!.id, status: p.status });
      }
    }

    const report = await pipeline_report();
    expect(report.data!.total).toBe(4);
    expect(report.data!.winLoss.won).toBe(1);
    expect(report.data!.winLoss.lost).toBe(1);
    expect(report.data!.winLoss.winRate).toBe(50);

    // Filter by client
    const alphaReport = await pipeline_report({ client: 'Alpha' });
    expect(alphaReport.data!.total).toBe(2);

    // List with status filter
    const sentProposals = await list_proposals({ status: 'sent' });
    expect(sentProposals.data!.total).toBe(1);
    expect(sentProposals.data!.proposals[0].clientName).toBe('Beta LLC');
  });

  it('CRM alignment with stored proposal', async () => {
    const draft = await draft_proposal({
      clientName: 'TechStart',
      projectDescription: 'App development',
      estimatedBudget: 25000,
      preparedBy: 'Dev Lead',
    });
    const saved = await save_proposal({ proposal: draft.data! });
    await update_proposal_status({ id: saved.data!.id, status: 'sent' });

    const alignment = await check_crm_alignment({
      id: saved.data!.id,
      crmContext: {
        companyName: 'TechStart',
        dealValue: 30000,
        dealStage: 'proposal',
        contactTitle: 'CTO',
      },
    });

    expect(alignment.success).toBe(true);
    expect(alignment.data!.clientNameMatch).toBe(true);
    expect(alignment.data!.stageAlignment!.proposalStatus).toBe('sent');
    expect(alignment.data!.valueAlignment!.delta).toBe(-5000);
  });

  it('delete removes proposal and history completely', async () => {
    const draft = await draft_proposal({
      clientName: 'DeleteMe Inc',
      projectDescription: 'Temporary',
      preparedBy: 'Author',
    });
    const saved = await save_proposal({ proposal: draft.data! });
    const id = saved.data!.id;
    await update_proposal_status({ id, status: 'reviewed' });

    await delete_proposal({ id });

    const getResult = await get_proposal({ id });
    expect(getResult.success).toBe(false);

    const historyResult = await proposal_history({ id });
    expect(historyResult.success).toBe(false);
  });
});
