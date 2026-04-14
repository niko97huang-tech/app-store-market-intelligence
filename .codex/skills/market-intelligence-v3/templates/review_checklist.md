# V3 Review Checklist

## Repo alignment

- README and docs match real scripts and outputs
- package.json scripts are believable
- verify command is documented and runnable

## Evidence layer

- evidence schema is unified
- evidence fields are present in JSON, not only Markdown
- panel roles consume the unified evidence structure

## Decision layer

- recommendation is ladder-first, not score-first
- downgrade conditions are visible
- counter-evidence can suppress stronger actions

## External evidence

- external evidence has schema, not just prose
- provider is pluggable and degradable
- no external evidence still allows the pipeline to run

## Output layer

- market-analysis, opportunities, CSV/XLSX, and dashboard use consistent terms
- dashboard highlights decisions, evidence, risks, and next actions

## Delivery

- test commands are provided
- manual acceptance steps are provided
- known limitations are clearly separated from completed work
