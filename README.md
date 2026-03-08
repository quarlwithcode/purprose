# purprose

Proposal generation MCP — HTML to PDF with templated styling.

## Installation

```bash
npm install
npm run build
```

## Usage

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

## Tools

### generate_proposal
Generate a complete proposal as HTML. Provide full proposal data and get formatted output.

### draft_proposal
Create a proposal draft from minimal input (client name, description, budget). Returns a structure you can refine.

### validate_proposal
Validate proposal data structure before generation.

### add_section
Add a new section to an existing proposal.

### update_investment
Update the investment/pricing section.

### list_templates
List available proposal templates.

## Proposal Structure

```typescript
{
  title: string;
  clientName: string;
  preparedBy: string;
  date: string;
  sections: [
    { title: string, content: string, type: 'text' | 'list' }
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
