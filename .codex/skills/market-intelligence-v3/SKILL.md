# market-intelligence-v3

## Purpose

Use this skill when working on this repository's core product:

`Node.js App Store market research assistant + decision-threshold system`

This skill exists to keep future agent work aligned with the repository's real goals and constraints.

This skill supports two modes:

- implementation mode
- review mode

## Project Identity

This repository is:

- a Node.js CLI pipeline
- file-system persisted
- schema-driven
- evidence-oriented
- report/export/dashboard output based

This repository is not:

- a generic crawler framework
- an online SaaS
- a database platform
- an auto-investment or auto-approval machine
- a Java / Spring / Vue migration target

## Default Working Model

Always reason through the main chain first:

`collect -> diff -> analyze -> opportunities -> export -> dashboard`

If a requested change does not clearly strengthen one step in this chain, or the docs/tests around it, question whether it belongs in this repository.

For multi-round V3 work, follow the execution order in `docs/codex_v3_execution_protocol.md`.

## Preferred Touch Points

When implementing changes:

- analysis logic goes in `src/analysis/`
- runtime/config/logging goes in `src/runtime/`
- top-level scripts should orchestrate, not contain heavy business logic
- docs should stay aligned with actual scripts and outputs

## Required Constraints

- Keep Node.js CLI + file-system persistence + static dashboard
- Do not require a database
- Do not migrate to Java / Spring / Vue
- Do not introduce unrelated large refactors
- Prefer schema clarity, tests, and docs consistency over feature sprawl
- Avoid placeholder fields, fake implementations, or output-only surface changes

## Before Changing Code

1. Identify the affected layer:
   - collect
   - diff
   - analysis
   - export
   - dashboard
   - runtime/testing/docs
2. Check the existing schema and output files first.
3. Decide the smallest valid change that preserves the current main chain.
4. Update docs if commands, outputs, or behavior change.

If the task is part of a V3 rollout, first state:

- what already exists in the repo
- what this round will change
- what this round will not change

## Validation Rules

Choose the smallest matching validation set:

- Syntax / entrypoint changes:
  - `npm run check`
- Analysis-kernel changes:
  - `npm run test:analysis`
- Main-chain changes:
  - `npm run verify:analysis -- --base-run-id run_2026-04-11_full --target-run-id run_2026-04-13_full --top-n 10`

If a change touches outputs, mention:

- run command
- validation command
- output path

For review mode, inspect:

- README
- docs
- scripts
- test commands
- at least one real output artifact when available

## Definition of Done

A change is only done when all apply:

- code runs
- key output schema can actually be generated
- README / docs / scripts stay aligned
- there is a minimal verification command
- no hollow fields or fake logic remain

## Common Safe Directions

Good directions for this repo:

- strengthen evidence quality
- improve trend reasoning
- clarify schemas
- improve test coverage
- improve doc accuracy
- improve export/dashboard readability without changing the core product identity
- deliver one bounded task package at a time

## Common Unsafe Directions

Avoid these unless explicitly re-scoped at repository level:

- multi-user platformization
- database-first redesign
- SaaS backend/frontend rebuild
- broad framework migration
- speculative abstraction for future plugins
- adding “AI conclusions” without evidence support
- mixing README rewrite, schema redesign, dashboard rebuild, and new infra in one round

## Suggested V3 Order

Use this order unless the human explicitly overrides it:

1. README V3 + doc alignment
2. V3 implementation audit
3. Evidence Schema V3
4. External Evidence Layer
5. Recommendation Ladder
6. Output and dashboard upgrade
7. Multi-agent review
8. Final delivery closeout

## Templates

Useful local helpers:

- `templates/status_sync_prefix.txt`
- `templates/anti_scope_creep.txt`
- `templates/review_checklist.md`
