import { Proposal, StyleConfig } from './types.js';

// HTML entity escaping for user-provided strings
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Default style for proposals
const defaultStyle: StyleConfig = {
  primaryColor: '#1a1a1a',
  secondaryColor: '#222222',
  accentColor: '#333333',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: 14.5,
  headerFont: "'Inter', -apple-system, sans-serif",
};

// Minimal template style overrides
const minimalStyle: Partial<StyleConfig> = {
  primaryColor: '#2d2d2d',
  secondaryColor: '#555555',
  accentColor: '#888888',
  fontSize: 14,
};

// Professional template style overrides
const professionalStyle: Partial<StyleConfig> = {
  primaryColor: '#1a1a2e',
  secondaryColor: '#333344',
  accentColor: '#16213e',
  headerFont: "'Georgia', 'Times New Roman', serif",
  fontSize: 14.5,
};

// Get style defaults for a template
function getTemplateStyle(templateId: string): Partial<StyleConfig> {
  switch (templateId) {
    case 'minimal': return minimalStyle;
    case 'professional': return professionalStyle;
    default: return {};
  }
}

// Generate CSS — optimized for print/PDF with NO PAGE BREAKS
function generateCSS(style: StyleConfig, templateId: string): string {
  const s = { ...defaultStyle, ...style };

  const isMinimal = templateId === 'minimal';
  const isProfessional = templateId === 'professional';

  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    ${isProfessional ? "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap');" : ''}

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: ${s.fontFamily};
      color: ${s.primaryColor};
      line-height: 1.6;
      background: #fff;
      font-size: ${s.fontSize}px;
      -webkit-font-smoothing: antialiased;
    }

    .page {
      max-width: 8.5in;
      margin: 0 auto;
      padding: ${isMinimal ? '40px 60px' : '56px 80px'};
    }

    /* Header */
    .header {
      margin-bottom: ${isMinimal ? '24px' : '32px'};
      ${isProfessional ? 'border-left: 4px solid ' + s.accentColor + '; padding-left: 20px;' : ''}
    }

    .header h1 {
      font-size: ${isMinimal ? '22px' : '26px'};
      font-weight: ${isMinimal ? '600' : '700'};
      letter-spacing: -0.3px;
      color: ${s.primaryColor};
      margin-bottom: ${isMinimal ? '10px' : '14px'};
      ${isProfessional ? "font-family: 'Playfair Display', " + (s.headerFont || 'serif') + ";" : s.headerFont ? 'font-family: ' + s.headerFont + ';' : ''}
    }

    .header-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 32px;
      font-size: ${isMinimal ? '13.5px' : '14.5px'};
      color: ${s.secondaryColor};
    }

    .header-meta strong {
      color: ${s.primaryColor};
      font-weight: 600;
    }

    /* Sections */
    .section {
      margin-bottom: ${isMinimal ? '22px' : '28px'};
      ${isProfessional ? 'border-bottom: 1px solid #e8e8e8; padding-bottom: 24px;' : ''}
    }

    .section:last-child {
      border-bottom: none;
    }

    .section-title {
      font-size: ${isMinimal ? '14px' : '15px'};
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${s.primaryColor};
      margin-bottom: 12px;
      ${isProfessional ? 'border-bottom: 2px solid ' + s.accentColor + '; padding-bottom: 6px; display: inline-block;' : ''}
    }

    .section p {
      color: ${s.secondaryColor};
      margin-bottom: 10px;
    }

    .section p:last-child {
      margin-bottom: 0;
    }

    .overview p {
      font-size: 15px;
      line-height: 1.7;
    }

    /* Scope Groups */
    .scope-group {
      margin-bottom: 18px;
    }

    .scope-group:last-child {
      margin-bottom: 0;
    }

    .scope-group-label {
      font-size: 13.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: ${s.accentColor};
      margin-bottom: 6px;
      ${isMinimal ? 'display: none;' : ''}
    }

    .scope-list {
      list-style: none;
      padding: 0;
    }

    .scope-list li {
      padding: 4px 0 4px 16px;
      position: relative;
      color: ${s.secondaryColor};
      line-height: 1.55;
    }

    .scope-list li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 12px;
      width: 5px;
      height: 5px;
      background: ${s.primaryColor};
      border-radius: 50%;
    }

    .scope-list li strong {
      color: ${s.primaryColor};
      font-weight: 600;
    }

    /* Timeline */
    .timeline-item {
      margin-bottom: 14px;
    }

    .timeline-item:last-of-type {
      margin-bottom: 0;
    }

    .timeline-item h3 {
      font-size: 14.5px;
      font-weight: 600;
      color: ${s.primaryColor};
      margin-bottom: 4px;
    }

    .timeline-item ul {
      list-style: none;
      padding: 0;
    }

    .timeline-item ul li {
      padding: 2px 0 2px 16px;
      position: relative;
      color: ${s.accentColor};
      font-size: 14px;
      line-height: 1.55;
    }

    .timeline-item ul li::before {
      content: '';
      position: absolute;
      left: 2px;
      top: 11px;
      width: 5px;
      height: 5px;
      background: #666;
      border-radius: 50%;
    }

    .timeline-note {
      font-size: 14px;
      font-style: italic;
      color: ${s.accentColor};
      margin-top: 10px;
    }

    /* Table sections */
    .section-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 14px;
    }

    .section-table th {
      text-align: left;
      padding: 8px 12px;
      background: ${s.primaryColor};
      color: #fff;
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #e8e8e8;
      color: ${s.secondaryColor};
    }

    .section-table tr:last-child td {
      border-bottom: none;
    }

    /* Investment (NOT "Cost") */
    .investment-amount {
      font-size: 28px;
      font-weight: 700;
      color: ${s.primaryColor};
      margin-bottom: 2px;
      letter-spacing: -0.5px;
    }

    .investment-desc {
      font-size: 14px;
      color: ${s.accentColor};
      margin-bottom: 12px;
    }

    .investment-block {
      margin-bottom: 20px;
    }

    .investment-block:last-of-type {
      margin-bottom: 12px;
    }

    .investment-label {
      font-size: 13.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: ${s.accentColor};
      margin-bottom: 4px;
    }

    /* Payment Terms */
    .payment-terms {
      list-style: none;
      padding: 0;
      margin-bottom: 12px;
    }

    .payment-terms li {
      padding: 3px 0;
      font-size: 14.5px;
      color: ${s.secondaryColor};
    }

    .payment-terms li strong {
      color: ${s.primaryColor};
      font-weight: 600;
    }

    .payment-note {
      font-size: 14px;
      color: ${s.accentColor};
      margin-bottom: 6px;
    }

    .payment-methods {
      font-size: 14px;
      color: ${s.accentColor};
    }

    /* Steps */
    .steps {
      list-style: none;
      padding: 0;
      counter-reset: steps;
    }

    .steps li {
      padding: 6px 0 6px 34px;
      position: relative;
      color: ${s.secondaryColor};
      counter-increment: steps;
      line-height: 1.55;
    }

    .steps li::before {
      content: counter(steps);
      position: absolute;
      left: 0;
      top: 7px;
      width: 22px;
      height: 22px;
      background: ${s.primaryColor};
      color: #fff;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .steps li strong {
      color: ${s.primaryColor};
      font-weight: 600;
    }

    /* Footer */
    .footer {
      margin-top: 32px;
      font-size: 14px;
      color: ${s.accentColor};
    }

    .footer a {
      color: ${s.primaryColor};
      text-decoration: none;
      font-weight: 500;
    }

    /* Print styles — NO PAGE BREAKS */
    @media print {
      body { font-size: 12px; }
      .page { padding: 48px 64px; max-width: none; }
      .header h1 { font-size: 22px; }
      .section { margin-bottom: 24px; }
      .investment-amount { font-size: 24px; }

      /* CRITICAL: Prevent page breaks */
      .section, .scope-group, .timeline-item, .investment-block {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  `;
}

// Format currency
function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Render scope group
function renderScopeGroup(label: string, items: string[]): string {
  return `
    <div class="scope-group">
      <div class="scope-group-label">${escapeHtml(label)}</div>
      <ul class="scope-list">
        ${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>
  `;
}

// Render timeline item
function renderTimelineItem(phase: string, tasks: string[]): string {
  return `
    <div class="timeline-item">
      <h3>${escapeHtml(phase)}</h3>
      <ul>
        ${tasks.map(task => `<li>${escapeHtml(task)}</li>`).join('')}
      </ul>
    </div>
  `;
}

// Parse timeline content: "Phase Name\nTask 1\nTask 2\n\nPhase 2\nTask 3"
function renderTimelineSection(content: string): string {
  const phases = content.split('\n\n').filter(block => block.trim());
  return phases.map(block => {
    const lines = block.split('\n').filter(l => l.trim());
    if (lines.length === 0) return '';
    const phase = lines[0];
    const tasks = lines.slice(1);
    return renderTimelineItem(phase, tasks);
  }).join('');
}

// Parse table content: "Header1,Header2\nVal1,Val2"
function renderTableSection(content: string): string {
  const rows = content.split('\n').filter(l => l.trim());
  if (rows.length === 0) return '';

  const headers = rows[0].split(',').map(h => h.trim());
  const dataRows = rows.slice(1);

  return `
    <table class="section-table">
      <thead>
        <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${dataRows.map(row => {
          const cells = row.split(',').map(c => c.trim());
          return `<tr>${cells.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

// Main template renderer
export function renderProposal(proposal: Proposal, templateId: string = 'default'): string {
  const templateDefaults = getTemplateStyle(templateId);
  const style = { ...defaultStyle, ...templateDefaults, ...proposal.style };
  const total = proposal.investment.reduce((sum, item) => sum + item.amount, 0);

  // Calculate deposit if 50-50
  const deposit = proposal.paymentTerms.structure === '50-50'
    ? Math.round(total / 2)
    : proposal.paymentTerms.deposit || total;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(proposal.title)}</title>
  <style>${generateCSS(style, templateId)}</style>
</head>
<body>
<div class="page">

  <div class="header">
    <h1>${escapeHtml(proposal.title)}</h1>
    ${proposal.subtitle ? `<p style="font-size: 16px; color: ${style.secondaryColor}; margin-bottom: 14px;">${escapeHtml(proposal.subtitle)}</p>` : ''}
    <div class="header-meta">
      <span><strong>Prepared For:</strong> ${escapeHtml(proposal.clientName)}${proposal.clientCompany ? ` (${escapeHtml(proposal.clientCompany)})` : ''}</span>
      <span><strong>Prepared By:</strong> ${escapeHtml(proposal.preparedBy)}${proposal.preparedByTitle ? `, ${escapeHtml(proposal.preparedByTitle)}` : ''}</span>
      <span><strong>Start:</strong> ${escapeHtml(proposal.startDate || 'Next business day after starting payment is received')}</span>
      <span><strong>Deadline:</strong> ${escapeHtml(proposal.estimatedDuration || 'TBD')}</span>
    </div>
  </div>

  ${proposal.sections.map(section => {
    const escapedTitle = escapeHtml(section.title);

    if (section.type === 'timeline') {
      return `
        <div class="section">
          <div class="section-title">${escapedTitle}</div>
          ${renderTimelineSection(section.content)}
        </div>
      `;
    }

    if (section.type === 'table') {
      return `
        <div class="section">
          <div class="section-title">${escapedTitle}</div>
          ${renderTableSection(section.content)}
        </div>
      `;
    }

    if (section.type === 'list') {
      const items = section.content.split('\n').filter(l => l.trim());
      return `
        <div class="section">
          <div class="section-title">${escapedTitle}</div>
          <ul class="scope-list">
            ${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    const cssClass = section.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    return `
      <div class="section ${cssClass}">
        <div class="section-title">${escapedTitle}</div>
        ${section.content.split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('')}
      </div>
    `;
  }).join('')}

  <div class="section">
    <div class="section-title">Investment</div>

    ${proposal.investment.map(item => `
      <div class="investment-block">
        <div class="investment-label">${escapeHtml(item.item)}</div>
        <div class="investment-amount">${formatCurrency(item.amount)}${item.recurring ? `/${escapeHtml(item.frequency)}` : ''}</div>
        ${item.description ? `<div class="investment-desc">${escapeHtml(item.description)}</div>` : ''}
      </div>
    `).join('')}

    ${proposal.investment.length > 1 ? `
      <div class="investment-block">
        <div class="investment-label">Total Investment</div>
        <div class="investment-amount">${formatCurrency(total)}</div>
      </div>
    ` : ''}

    <div class="investment-block">
      <div class="investment-label">Payment Terms</div>
      <ul class="payment-terms">
        ${proposal.paymentTerms.structure === '50-50' ? `
          <li><strong>50% deposit:</strong> ${formatCurrency(deposit)} to begin</li>
          <li><strong>50% completion:</strong> ${formatCurrency(total - deposit)} upon delivery</li>
        ` : proposal.paymentTerms.structure === 'upfront' ? `
          <li><strong>Full payment:</strong> ${formatCurrency(total)} to begin</li>
        ` : proposal.paymentTerms.milestones ?
          proposal.paymentTerms.milestones.map(m =>
            `<li><strong>${m.percentage}%:</strong> ${escapeHtml(m.description)}</li>`
          ).join('')
          : `<li>${escapeHtml(proposal.paymentTerms.notes || 'Terms to be discussed')}</li>`
        }
      </ul>
      <div class="payment-methods">${escapeHtml(proposal.paymentMethods || 'Payment methods to be discussed')}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Next Steps</div>
    <ol class="steps">
      <li><strong>Review</strong> this proposal and reply with any questions</li>
      <li><strong>Confirm</strong> scope and timeline</li>
      <li><strong>Send deposit</strong> to begin work</li>
      <li><strong>Kick off</strong> with discovery call</li>
    </ol>
  </div>

  <div class="footer">
    ${proposal.contactEmail ? `<a href="mailto:${escapeHtml(proposal.contactEmail)}">${escapeHtml(proposal.contactEmail)}</a>` : ''}
    ${proposal.contactEmail && proposal.contactPhone ? ' | ' : ''}
    ${proposal.contactPhone ? escapeHtml(proposal.contactPhone) : ''}
    ${style.footerText ? `<br>${escapeHtml(style.footerText)}` : ''}
  </div>

</div>
</body>
</html>`;
}
