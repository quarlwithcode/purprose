# purprose — Proposal Generation & Management

Generate, track, and analyze professional client proposals with lifecycle management, pipeline analytics, and CRM alignment.

## Quick Start

### Via MCP Tools
```typescript
// Create draft from minimal info
draft_proposal({
  clientName: "Acme Corp",
  projectDescription: "Website redesign with brand update",
  estimatedBudget: 5000,
  preparedBy: "Your Name"
})

// Save to database
save_proposal({ proposal: draftData, templateId: "professional" })

// Track lifecycle
update_proposal_status({ id: "uuid", status: "sent", notes: "Emailed to client" })

// Pipeline analytics
pipeline_report({ client: "Acme" })

// CRM alignment check
check_crm_alignment({ id: "uuid", crmContext: { dealValue: 5000, dealStage: "proposal" } })
```

### Via CLI
```bash
# Generate from JSON
npx purprose generate proposal-data.json -o client-proposal.html

# Create draft
npx purprose draft --client "Acme Corp" --description "Website redesign" --budget 5000 --by "Your Name"

# Validate structure
npx purprose validate proposal-data.json

# List proposals
npx purprose list --status sent --client "Acme"

# Get proposal details
npx purprose get <uuid>

# Update status
npx purprose status <uuid> sent --notes "Emailed to client"

# Delete proposal
npx purprose delete <uuid>
```

## MCP Tools (14)

### Generation (6 tools)
| Tool | Description |
|------|-------------|
| `generate_proposal` | Generate HTML/PDF from full proposal data. Options: `outputFormat`, `templateId`, `save` |
| `validate_proposal` | Validate proposal JSON structure. Returns errors if invalid |
| `draft_proposal` | Create starter proposal from minimal input (client, description, budget, preparer) |
| `add_section` | Add a section to a proposal at a given position |
| `update_investment` | Replace investment/pricing line items |
| `list_templates` | List available templates: default, minimal, professional |

### Lifecycle (5 tools)
| Tool | Description |
|------|-------------|
| `save_proposal` | Persist proposal to SQLite database with status and template |
| `get_proposal` | Retrieve a saved proposal by UUID |
| `list_proposals` | List/filter proposals by status, client, date range with pagination |
| `update_proposal_status` | Transition status with optional notes. Records audit trail |
| `delete_proposal` | Delete proposal and cascaded status history |

### Analytics (2 tools)
| Tool | Description |
|------|-------------|
| `pipeline_report` | Pipeline summary: counts/values by status, weighted value, win/loss rates, top clients |
| `proposal_history` | Full status change audit trail for a proposal |

### CRM Alignment (1 tool)
| Tool | Description |
|------|-------------|
| `check_crm_alignment` | Compare proposal against CRM data: client name, deal value, stage mapping, dates, gaps |

## CLI Commands (8)

| Command | Description |
|---------|-------------|
| `generate <input.json>` | Generate HTML/PDF. Options: `-o`, `-f html\|pdf`, `-t template`, `--save` |
| `draft` | Create draft JSON. Options: `--client`, `--description`, `--budget`, `--by` |
| `validate <input.json>` | Validate proposal structure |
| `list` | List proposals. Options: `--status`, `--client` |
| `get <id>` | Show proposal details |
| `status <id> <status>` | Update status. Options: `--notes` |
| `delete <id>` | Delete proposal |
| `help` | Show help text |

## Lifecycle States

```
draft → reviewed → sent → approved → won
                                   → lost
```

- **draft**: Initial state when saved
- **reviewed**: Internally reviewed by team
- **sent**: Delivered to client
- **approved**: Client approved, pending close
- **won**: Deal closed successfully
- **lost**: Deal lost

## Proposal Structure

```json
{
  "title": "Project Name: Scope Description",
  "clientName": "Client Name",
  "clientCompany": "Company Name (optional)",
  "preparedBy": "Your Name",
  "preparedByTitle": "Your Title (optional)",
  "date": "2026-03-08",
  "validUntil": "2026-04-08",

  "sections": [
    {
      "title": "Overview",
      "content": "Project description paragraph...",
      "type": "text"
    },
    {
      "title": "Scope of Work",
      "content": "Item 1\nItem 2\nItem 3",
      "type": "list"
    },
    {
      "title": "Project Timeline",
      "content": "Phase 1: Discovery\nResearch\nStakeholder interviews\n\nPhase 2: Design\nWireframes\nVisual mockups",
      "type": "timeline"
    },
    {
      "title": "Feature Comparison",
      "content": "Feature,Basic,Premium\nPages,5,Unlimited\nSupport,Email,Priority",
      "type": "table"
    }
  ],

  "investment": [
    {
      "item": "Website Development",
      "description": "5-page responsive site",
      "amount": 2500,
      "recurring": false
    },
    {
      "item": "Monthly Maintenance",
      "amount": 200,
      "recurring": true,
      "frequency": "monthly"
    }
  ],

  "paymentTerms": {
    "structure": "50-50",
    "notes": "Optional custom terms"
  },

  "startDate": "Next business day after starting payment is received",
  "estimatedDuration": "14 days from start",

  "contactEmail": "you@example.com",
  "contactPhone": "555-123-4567",

  "style": {
    "primaryColor": "#1a1a1a",
    "secondaryColor": "#222222",
    "accentColor": "#333333",
    "fontFamily": "'Inter', sans-serif",
    "fontSize": 14.5,
    "logoUrl": "https://example.com/logo.png",
    "footerText": "Thank you for your consideration."
  }
}
```

## Templates

- **default** — Clean Inter font, dark text, balanced spacing
- **minimal** — Lighter colors, smaller margins, simplified header, no scope-group labels
- **professional** — Serif header font (Playfair Display), colored accent bar, section dividers

## Style Rules (CRITICAL)

These rules are enforced in all generated proposals:

1. **"Investment" not "Cost"** — Never use the word "cost"
2. **No em-dashes** — Use colons instead (e.g., "Website: 5 pages")
3. **Minimum 13px font** — For 60+ readability
4. **Secondary color #444 or darker** — High contrast
5. **50/50 payment default** — 50% deposit, 50% on completion
6. **No page breaks** — Print CSS prevents mid-section breaks

## Payment Structures

- `upfront` — Full payment before work begins
- `50-50` — 50% deposit, 50% on completion (DEFAULT)
- `milestone` — Custom percentage milestones
- `custom` — Freeform terms via `notes` field

## Section Types

- `text` — Paragraphs (split by double newlines)
- `list` — Bullet points (split by single newlines)
- `timeline` — Phases with tasks (phases separated by blank lines; first line is phase name, subsequent lines are tasks)
- `table` — Data table (comma-separated values; first row is headers)

## Pipeline Analytics

The `pipeline_report` tool provides:
- **Proposal counts and values** broken down by status
- **Weighted pipeline value** using status weights (draft=10%, reviewed=25%, sent=50%, approved=75%)
- **Win/loss statistics**: win count, loss count, win rate percentage
- **Average deal values** for won and lost proposals
- **Recent activity**: last 10 status changes across all proposals
- **Top clients** ranked by total proposal value

Filter by date range (`dateFrom`, `dateTo`) and/or client name.

## CRM Alignment

The `check_crm_alignment` tool compares proposal data against CRM context:
- **Client name matching** — Partial string match between proposal and CRM
- **Value alignment** — Delta and percentage difference between proposal total and CRM deal value
- **Stage mapping** — Maps CRM stages to expected proposal statuses (e.g., "proposal" stage expects "sent" status)
- **Date alignment** — Checks if proposal validity covers CRM close date
- **Gap detection** — Identifies missing fields (company name, contact title)
- **Actionable suggestions** — Recommends specific fixes for misalignments

Provide either inline `proposal` data or a stored proposal `id`.

## Example Workflow

```typescript
// 1. Create draft
const draft = await draft_proposal({
  clientName: "Riverside Consulting",
  projectDescription: "Brand refresh including logo, colors, and new website",
  estimatedBudget: 2800,
  preparedBy: "Your Name"
});

// 2. Add sections
const withScope = await add_section({
  proposal: draft.data,
  title: "Scope of Work",
  content: "Logo design (3 concepts, 2 revisions)\nColor palette\nBrand guidelines PDF\n5-page website",
  type: "list"
});

// 3. Update investment
const final = await update_investment({
  proposal: withScope.data,
  items: [
    { item: "Brand Package", amount: 1500 },
    { item: "Website", description: "5 pages, mobile responsive", amount: 1300 }
  ]
});

// 4. Save to database
const saved = await save_proposal({
  proposal: final.data,
  templateId: "professional"
});

// 5. Track through lifecycle
await update_proposal_status({ id: saved.data.id, status: "reviewed", notes: "Team approved" });
await update_proposal_status({ id: saved.data.id, status: "sent", notes: "Emailed to client" });

// 6. Generate HTML
const html = await generate_proposal({
  proposal: final.data,
  outputFormat: "html",
  templateId: "professional"
});

// 7. Check pipeline
const report = await pipeline_report();
// → { total: 1, byStatus: { sent: { count: 1, value: 2800 } }, ... }
```

## Tips

- Use specific project titles ("Riverside Consulting: Brand Build & Digital Update")
- Include deadline as "X days from start"
- Always include "Next Steps" section (auto-generated)
- Test print preview before sending
- Use `save` flag on generate to persist in one step: `generate_proposal({ ..., save: true })`
- Filter pipeline reports by client to track specific relationships
