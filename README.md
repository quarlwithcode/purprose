# purprose

Proposal management MCP server and CLI — generate, track, and analyze proposals.

**Create → Send → Track → Report** — the full proposal lifecycle, designed for AI agent integration.

## Installation

```bash
npm install @cubicrew/purprose
```

Or from source:

```bash
npm install
npm run build
```

### Optional: PDF Generation

```bash
npm install puppeteer
```

Puppeteer enables direct PDF output. Without it, purprose generates HTML (which you can print to PDF from a browser).

## Usage

### MCP Server

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "purprose": {
      "command": "node",
      "args": ["/path/to/purprose/dist/index.js"]
    }
  }
}
```

### CLI

```bash
# Generate from JSON
purprose generate proposal-data.json -o client-proposal.html

# Generate PDF (requires puppeteer)
purprose generate proposal-data.json -f pdf -o proposal.pdf

# Generate and save to database
purprose generate proposal-data.json --save

# Create draft
purprose draft --client "Acme Corp" --description "Website redesign" --budget 5000 --by "Your Name"

# Validate structure
purprose validate proposal-data.json

# List saved proposals
purprose list --status draft --client "Acme"

# Get proposal details
purprose get <id>

# Update status
purprose status <id> sent --notes "Emailed to client"

# Delete proposal
purprose delete <id>
```

## Tools

### Generation

| Tool | Description |
|------|-------------|
| `generate_proposal` | Generate HTML/PDF from proposal data. Set `save: true` to persist. |
| `draft_proposal` | Create a proposal draft from minimal input (client, description, budget). |
| `validate_proposal` | Validate proposal data structure before generation. |
| `add_section` | Add a new section to an existing proposal. |
| `update_investment` | Update the investment/pricing section. |
| `list_templates` | List available templates (`default`, `minimal`, `professional`). |

### Lifecycle

| Tool | Description |
|------|-------------|
| `save_proposal` | Save a proposal to the database with status tracking. |
| `get_proposal` | Retrieve a saved proposal by UUID. |
| `list_proposals` | List proposals with filters (status, client, date range, pagination). |
| `update_proposal_status` | Change status: `draft` → `reviewed` → `sent` → `approved` → `won`/`lost`. |
| `delete_proposal` | Remove a proposal and its history. |

### Analytics

| Tool | Description |
|------|-------------|
| `pipeline_report` | Pipeline summary: counts/values by status, weighted pipeline, win/loss rates, top clients. |
| `proposal_history` | Full status change audit trail for a proposal. |

### CRM Alignment

| Tool | Description |
|------|-------------|
| `check_crm_alignment` | Compare proposal against CRM data — finds gaps, value mismatches, stage misalignment. |

## Templates

- **default** — Clean Inter font, dark text, balanced spacing
- **minimal** — Lighter colors, smaller margins, simplified header
- **professional** — Serif header font (Playfair Display), accent bar, section dividers

## Proposal Structure

```typescript
{
  title: string;
  clientName: string;
  preparedBy: string;
  date: string;
  sections: [
    { title: string, content: string, type: 'text' | 'list' | 'timeline' | 'table' }
  ];
  investment: [
    { item: string, amount: number, recurring?: boolean }
  ];
  paymentTerms: {
    structure: 'upfront' | '50-50' | 'milestone' | 'custom'
  };
  style?: {
    primaryColor: string;
    fontFamily: string;
    logoUrl?: string;
  }
}
```

## Section Types

- `text` — Paragraphs (split by double newlines)
- `list` — Bullet points (split by single newlines)
- `timeline` — Phases with tasks (phases separated by blank lines, first line is phase name, subsequent lines are tasks)
- `table` — Data table (comma-separated values, first row is headers)

## Status Lifecycle

```
draft → reviewed → sent → approved → won
                                   → lost
```

Each status change is recorded with timestamp and optional notes, creating a full audit trail.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PURPROSE_DB_PATH` | SQLite database file path | `~/.purprose/proposals.db` |

## Pipeline Analytics

The `pipeline_report` tool returns:
- **Summary**: total proposals, count + value by status
- **Pipeline**: total active value, weighted value (draft=10%, reviewed=25%, sent=50%, approved=75%)
- **Win/loss**: won count, lost count, win rate %, average won/lost value
- **Recent activity**: last 10 status changes
- **Top clients**: grouped by client with count + total value

## CRM Alignment

The `check_crm_alignment` tool compares proposals against CRM context data:
- Client name matching
- Deal value alignment (delta + percentage)
- Stage alignment (maps CRM stages to proposal statuses)
- Date alignment (proposal validity vs close date)
- Gap detection (missing fields, mismatches)
- Actionable suggestions

No API calls — pure data comparison. The LLM does the reasoning.

## Flavor

Uses `proposals` flavor:
- No em-dashes (use colons)
- "Investment" not "Cost"
- Minimum 13px font
- #444 secondary color
- 50/50 payment structure default
- High readability for 60+ clients

## License

MIT — CubiCrew 2026
