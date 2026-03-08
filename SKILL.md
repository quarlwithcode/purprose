# purprose — Proposal Generation

Generate professional client proposals as HTML (print-ready, no page breaks) or PDF.

## Quick Start

### Via MCP Tools
```typescript
// Generate full proposal
generate_proposal({
  proposal: { ...proposalData },
  outputFormat: "html"
})

// Create draft from minimal info
draft_proposal({
  clientName: "Acme Corp",
  projectDescription: "Website redesign with brand update",
  estimatedBudget: 5000,
  preparedBy: "Your Name"
})
```

### Via CLI
```bash
# Generate from JSON
npx purprose generate proposal-data.json -o client-proposal.html

# Create draft
npx purprose draft --client "Acme Corp" --description "Website redesign" --budget 5000 --by "Your Name"

# Validate structure
npx purprose validate proposal-data.json
```

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
- `timeline` — Phases with tasks (future)
- `table` — Comparison tables (future)

## Output Formats

- `html` — Print-ready HTML, open in browser and Print to PDF
- `pdf` — Direct PDF (requires puppeteer, falls back to HTML)

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

// 4. Generate
const html = await generate_proposal({
  proposal: final.data,
  outputFormat: "html"
});

// 5. Save and send
await writeFile("hair-du-jour-proposal.html", html.data.html);
```

## Tips

- Use specific project titles ("Riverside Consulting: Brand Build & Digital Update")
- Include deadline as "X days from start"
- Always include "Next Steps" section (auto-generated)
- Test print preview before sending
