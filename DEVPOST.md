# InnerSpark Workforce AI — Devpost Submission Context

This file is a compact handoff for AI assistants and developers working on the Build with Gemini XPRIZE submission. For the canonical recovery instructions and current architecture, read `PROJECT_CONTEXT.md` first.

## Current Project State

The application integrates Google Gemini AI and the core Workforce AI product features:

1. **Gemini AI Integration (`/api/agent/route.ts`)**
   - Uses `@google/genai` and Gemini 2.5 Flash for server-side Function Calling.
   - The Workforce Agent can select authorized business functions such as employee lookup and pre-payroll analysis.
   - `GEMINI_API_KEY` must remain an environment secret and must never be committed.
   - Core workforce functionality has a basic fallback path when Gemini is unavailable or quota/API errors occur.
   - Chat history is persisted locally on the frontend for continuity of the user experience.

2. **Mobile Check-in**
   - Remote attendance with GPS coordinates and photographic evidence.
   - Photos are designed to be stored in a private Google Cloud Storage bucket.
   - Authorized reporting views can use reverse geocoding to convert coordinates into readable locations.

3. **Multi-Tenant SaaS Architecture**
   - Production/business contexts include PC Doctor, IA Pro and FEMAR-related work.
   - Customer PII and credentials belong only in private data/auth systems, never in public source or public evidence.
   - Server-side authorization must verify tenant membership before exposing data or executing Gemini tools.

4. **Business Validation**
   - IA Pro is an invoiced and paid B2B customer for implementation plus recurring service.
   - PC Doctor is an operating/internal validation environment and commercial operator.
   - FEMAR is an active commercial opportunity combining access-control infrastructure with the complementary Workforce AI layer.

## XPRIZE Submission Priorities

- Finalize production-safe authentication and tenant isolation.
- Verify Gemini Function Calling against authorized tenant data.
- Run build/tests/secret scan and verify the deployed Google Cloud revision.
- Package Google Cloud billing, Gemini observability and agent execution evidence.
- Package revenue/customer evidence and simple P&L.
- Record a <=3 minute demo showing AI live in production and executing a meaningful workforce workflow.

## Fresh-session Instructions

When opening a new Antigravity/Codex/IDE session:

1. Treat GitHub `Rafa-Innerchispa/innerspark-workforce-ai` as the source of truth.
2. Pull the latest `main` before making changes.
3. Read `PROJECT_CONTEXT.md` and this file.
4. Inspect recent commits before assuming a feature is missing.
5. Do not rebuild from a stale local workspace.
6. Do not commit credentials, national identity numbers, customer PII, private photos, tokens or secrets.
7. Push focused commits back to GitHub so the next session can recover from any machine.
8. Verify the corresponding Google Cloud deployment after code changes.

The project is a real commercial product, not a hackathon-only demo. Preserve production stability while preparing the XPRIZE submission.
