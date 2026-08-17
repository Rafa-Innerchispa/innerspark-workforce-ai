# Stabilization and Recovery Plan - Part 2 (Approved)

This plan details the fixes for:
1. **Dynamic Reports & Payroll Calculations**: Resolving hardcoded / duplicate values across date ranges, enabling employee search filtering, and calculating real delays and absences from Firestore logs.
2. **Realistic Employee Seeding**: Populating Firestore with 100% realistic Ecuadorian employee data, valid cédulas (Modulo 10 verified), real names, corporate emails, and high-quality avatars.
3. **Gemini model tier downgrade to increase rate limits**: Downgrading the Gemini API model to `gemini-1.5-flash` (15 RPM) to avoid the strict `gemini-2.5-flash` free tier limit (5 RPM), eliminating resource exhaustion fallbacks.

## Proposed Changes

### Component 1: Reports & Payroll Engine

#### [MODIFY] [page.tsx](file:///home/rlopez/projects/innerspark-workforce-ai/services/femar-mvp-core/src/app/reports/page.tsx)
- Add date filtering logic to restrict `mobileLogs` to the selected `dateRange` (Month, Last Month, Year, Custom).
- Enforce the selected employee filter across all report types (absences, delays, consolidated), not just payroll.
- Replace static dummy metrics in the Absences (*Faltas*) and Delays (*Atrasos*) reports with live calculations matching active check-in timestamps.
- Solve the dropdown list search query matching.

### Component 2: Seeding Real Employee Data

#### [NEW] [seed_real_employees.mjs](file:///home/rlopez/projects/innerspark-workforce-ai/services/femar-mvp-core/seed_real_employees.mjs)
- A node script that seeds Firestore `employees` collection with 50 highly realistic Ecuadorian records, including:
  - Valid Modulo 10 national IDs (cédulas)
  - Realistic Spanish names and corporate email addresses
  - Varied departments, roles, base salaries, and status fields
  - High-quality adult avatar images

### Component 3: Gemini Model Tier & Tool Call Search Parameters

#### [MODIFY] [route.ts](file:///home/rlopez/projects/innerspark-workforce-ai/services/femar-mvp-core/src/app/api/agent/route.ts)
- Downgrade the AI model from `'gemini-2.5-flash'` to `'gemini-1.5-flash'` to leverage the 15 RPM free tier limit.
- Upgrade `getEmployeesDeclaration` parameters to support optional `id` and `searchQuery` keys.
- Update `calculate_payroll` tool function implementation to accept date filtering and match the dynamic reports output.

---

## Verification Plan

### Automated Verification
- Run `npm run build` to verify there are no TypeScript compile/build errors.

### Manual Verification
- Deploy to Cloud Run and verify reports and Gemini calculations return real details for the sandbox company.
