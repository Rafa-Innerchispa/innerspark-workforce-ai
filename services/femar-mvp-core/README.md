# FEMAR - MVP Core

This is the core MVP service for **FEMAR Workforce AI**, providing attendance and pre-payroll functionalities.
It includes the ADMS endpoint for biometric devices and mobile check-in capabilities.

## Setup

1. Make sure you have a `innerspark-workforce-ai` GCP project and Firestore enabled in `us-central1`.
2. Provide the service account key via `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable.
3. Install dependencies:
   ```bash
   npm install
   ```

## Development

Run the development server:

```bash
npm run dev
```

## Testing

Run tests (including synthetic E2E tests):

```bash
npm run test
```

## Production

Build the reproducible output:

```bash
npm run build
```
