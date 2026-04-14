# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project is beginning to adopt
semantic versioning discipline for future public releases.

## [Unreleased]

### Added
- Decision-oriented market analysis V2 with executive summary, decision cards, negative findings, panel reviews, and final decisions.
- Trend-enhanced V2.1 analysis flow with multi-run trend metrics integrated into persistence scoring and report outputs.
- Unified runtime config and structured logger for core pipeline scripts.
- Regression verification command for the analysis pipeline.
- Analysis kernel tests covering scoring, decision constraints, export fields, evidence auditing, and skeptical review behavior.
- Developer onboarding guide and troubleshooting documentation.
- Open source collaboration base files: license, contributing guide, issue templates, and pull request template.

### Changed
- Core analysis outputs now emit trend fields in JSON, Markdown, CSV, and XLSX exports.
- Pipeline and post-collection scripts now use shared runtime configuration and logging conventions.

