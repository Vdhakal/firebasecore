# @fiyareuse/firebase-core

Shared Firebase Admin initialization helpers for CoachAI apps.

## Install

```bash
npm install @fiyareuse/firebase-core firebase-admin
```

## Usage

```ts
import { getFirestore, initializeFirebaseAdminApp } from "@fiyareuse/firebase-core";

initializeFirebaseAdminApp();
const db = getFirestore();
```

## Requirements

- Node.js 18+
- A Firebase service account JSON set via `FIREBASE_SERVICE_ACCOUNT` or a local JSON file path.

## License

MIT
