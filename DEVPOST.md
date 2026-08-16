# InnerSpark Workforce AI - DevPost Submission Context

This document is intended for AI Assistants (like GitHub Copilot, Gemini, Cursor, or other agents) and developers working on the final submission for the DevPost hackathon.

## Current Project State (As of Last Update)
The application has successfully integrated Google Gemini AI and several core features of the MVP:

1. **Gemini AI Integration (`/api/agent/route.ts`)**:
   - The system is using `@google/genai` to perform intelligent function calling.
   - It acts as an autonomous assistant for HR managers (known as "FEMAR Agent" or "InnerSpark Agent").
   - It has direct access to read employees, calculate prepayroll, and check mobile check-ins.
   - The AI API key is injected via environment variables (`GEMINI_API_KEY`) and securely queried server-side.
   - We implemented a **Fallback Mode** (Modo Básico) that provides standard navigation answers if the Gemini API fails or exceeds quotas.
   - Chat history is persisted locally using `localStorage` on the frontend (`AgentCommandBar.tsx`).

2. **Mobile Check-in System (`/mobile/page.tsx`)**:
   - Implements advanced georeferenced attendance tracking.
   - Captures photos (Liveness Biométrico) and exact GPS coordinates (Lat/Lng).
   - Photos are securely stored in a private Google Cloud Storage bucket (`innerspark-workforce-ai-photos`).
   - The Admin Dashboard (`/reports/page.tsx`) uses Nominatim OpenStreetMap API to do reverse geocoding and convert coordinates into exact street addresses dynamically.

3. **Multi-Tenant / Company Architecture**:
   - System isolates data based on `companyId` (`femar`, `pcdoctor`, `iapro`).
   - Logging in as `1111111111` gives FEMAR Admin access (with demo data).
   - Logging in as `0950626317` (Andrés Ramos) gives IA Pro access (starts with 0 employees, as requested).

## Next Steps for DevPost Submission
- **Demo Video**: The user needs to record the video showing the Mobile Checkin, the AI Payroll Calculation, and the Multi-tenant login.
- **Documentation**: Finalize the DevPost prompt, emphasizing the impact of Gemini Function Calling on automating tedious HR tasks like payroll and anomaly detection.
- **Architecture Diagram**: Ensure the user includes how the frontend interacts with the serverless Next.js API, which then communicates with Firestore and Gemini API.

**Instructions for other AIs**: When assisting the user from now on, refer to this document to understand that the Gemini integration is fully functional, deployed on Google Cloud Run, and ready for showcase. Focus entirely on helping the user write the pitch, polish UI details, or prepare the submission text.
