# purprose Workflow: Full Proposal Lifecycle

## Step 1: Draft a Proposal

```bash
purprose draft --client "Acme Corp" --description "Website redesign with modern stack" --budget 15000 --by "Jane Smith"
```

This creates `acme-corp-proposal-draft.json` with a starter structure.

## Step 2: Refine and Generate

Edit the JSON to add sections, adjust investment items, pick a template:

```bash
purprose generate acme-corp-proposal-draft.json --template professional --save -o acme-proposal.html
```

The `--save` flag persists the proposal to the database and returns an ID.

## Step 3: Track Status

```bash
# After internal review
purprose status <id> reviewed --notes "Approved by team lead"

# After sending to client
purprose status <id> sent --notes "Emailed to john@acme.com"

# Client accepts
purprose status <id> won --notes "Signed contract received"
```

## Step 4: View Pipeline

```bash
purprose list --status sent
purprose get <id>
```

Via MCP tools:

```
pipeline_report → summary of all proposals, win rates, top clients
proposal_history({ id }) → full audit trail
```

## Step 5: CRM Alignment (via MCP)

```
check_crm_alignment({
  id: "<proposal-id>",
  crmContext: {
    companyName: "Acme Corp",
    dealValue: 15000,
    dealStage: "proposal",
    contactName: "John Doe",
    contactTitle: "VP Engineering"
  }
})
```

Returns gaps and suggestions: missing fields, value mismatches, stage alignment issues.

## MCP Agent Workflow

An AI agent can orchestrate the entire lifecycle:

1. **draft_proposal** — create from meeting notes or CRM data
2. **add_section** / **update_investment** — refine content
3. **generate_proposal** with `save: true` — render and persist
4. **update_proposal_status** — track through pipeline
5. **pipeline_report** — analyze performance
6. **check_crm_alignment** — verify consistency with CRM
