# InnerSpark Workforce AI — Canonical Project Context

Last updated: 2026-08-16

## Source of truth

- Canonical source code: GitHub repository `Rafa-Innerchispa/innerspark-workforce-ai`.
- Default branch for the current product: `main`.
- Latest verified HEAD when this context was written: `15ce8947c841f7b4933a1ae802a1e2429a34d5a7`.
- The application runtime is cloud-based. The project is designed to run on Google Cloud; local clones/workspaces are disposable development copies and must never be treated as the source of truth.
- When opening a fresh Antigravity/Codex/IDE chat, always clone/pull from GitHub first, inspect the current HEAD, and only then make changes.

## Product

InnerSpark Workforce AI is a real B2B multi-tenant workforce operations product for SMBs. It is not a hackathon-only demo.

Core capabilities currently represented in the repository include:

- Multi-tenant company separation and role-based access.
- Employee and device management.
- ZKTeco ADMS attendance integration.
- Remote mobile check-in with GPS and photographic evidence.
- Private Google Cloud Storage for mobile evidence.
- Firestore operational data layer.
- Attendance records, novelties and pre-payroll workflows.
- Reverse geocoding for authorized reporting views.
- Gemini integration via `@google/genai` and server-side Function Calling.
- Basic non-AI fallback so core operations continue if Gemini is unavailable.

## Gemini / AI architecture

- Server-side Gemini route: `/api/agent/route.ts`.
- Gemini model currently documented for the project: Gemini 2.5 Flash.
- Gemini is used as a reasoning/orchestration layer, not as the source of truth for payroll math.
- Payroll-sensitive calculations should remain deterministic and auditable application functions.
- Gemini may interpret requests, select authorized functions/tools, analyze results and explain them to supervisors.
- All AI tools must remain tenant-scoped server-side. Never trust a frontend-supplied `companyId` without verifying the authenticated membership/session.

## Google Cloud architecture

Production-oriented stack:

- Google Cloud Run — serverless application deployment.
- Google Firestore — workforce operational records.
- Google Cloud Storage — private photos/evidence.
- Gemini API — AI reasoning / Function Calling.
- Environment secrets must stay outside GitHub.

Do not assume a developer's local machine or a local server contains the authoritative project. Always recover code from GitHub and recover runtime/configuration from Google Cloud/environment configuration.

## Real business validation

Production/business tenants include PC Doctor, IA Pro and FEMAR-related work. They must remain private and isolated.

- IA Pro is a real invoiced customer for the Workforce AI implementation/service.
- PC Doctor is an operating/internal validation environment and commercial operator.
- FEMAR is an active commercial opportunity involving access-control infrastructure plus the complementary Workforce AI layer.

Never expose customer PII, passwords, identity numbers, private photos, tokens or secrets in GitHub, public Devpost material or public screenshots.

## Authentication direction

The target authentication architecture is:

1. Existing authorized users may use document-based login during migration.
2. Add Google OAuth / Firebase Authentication in parallel, not destructively.
3. Google authenticates identity; Workforce AI authorizes company membership and role server-side.
4. Future Google users must be preauthorized/invited by an administrator before first access.
5. Google `uid` must link to the existing employee record rather than creating duplicates.
6. Support multiple document types such as Ecuadorian ID, Chilean RUN, passport and other identifiers.
7. Passwords/secrets must never be hardcoded in source or documentation.

## XPRIZE evaluation tenant

Use a separate evaluation tenant such as `InnerSpark Labs` / `XPRIZE Sandbox Company` for judges and public evidence.

- It is a sandbox, not a paying customer and not revenue.
- It must be isolated from PC Doctor, IA Pro and FEMAR.
- It should support Admin, Supervisor and Employee roles.
- It should demonstrate Google OAuth, mobile check-in, GPS/photo evidence, dashboard/reporting and Gemini Function Calling using sandbox data.
- Do not invent realistic national identity numbers for sandbox users. Internal employee IDs are sufficient when Google OAuth is the real authentication method.

## Devpost / Build with Gemini XPRIZE

Devpost project ID: `1365759`
Project name: `InnerSpark Workforce AI`
Project slug: `innerspark-workforce-ai`
Hackathon slug: `xprize`
Category target: `Small Business Services`

Final evidence priorities:

1. GitHub repository complete and accessible to judges.
2. <=3 minute video showing AI live in production and executing meaningful workflow decisions.
3. Google Cloud billing evidence.
4. Gemini observability / API execution evidence.
5. Agent/function execution logs.
6. Revenue evidence and simple P&L.
7. Customer evidence.

## Development protocol for any fresh AI/IDE session

Before coding:

1. Open/clone `Rafa-Innerchispa/innerspark-workforce-ai` from GitHub.
2. `git fetch --all --prune`.
3. Inspect branch and `git status`.
4. Pull/rebase from the remote source of truth.
5. Read this file and `DEVPOST.md`.
6. Inspect recent commits before assuming any feature is missing.
7. Never rebuild the project from an old local directory when GitHub has newer code.
8. Never push secrets/PII.
9. Make focused commits and push them to GitHub so the next session can recover immediately.
10. Verify the deployed Google Cloud version after code changes.

## Current XPRIZE priority

Do not spend time on unnecessary visual rewrites. Prioritize:

1. Production-safe authentication / Google OAuth and tenant authorization.
2. Security and PII cleanup in public source/docs.
3. Verifiable Gemini Function Calling with tenant isolation.
4. Build/tests/secret scan.
5. Cloud deployment verification.
6. Evidence pack and demo video.

This file is intentionally safe for a public repository: it contains architecture and handoff context, not private credentials or customer identity data.
