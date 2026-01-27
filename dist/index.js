import * as admin from "firebase-admin";
import { existsSync, readFileSync } from "node:fs";
const defaultLogger = {
    warn: (message, context) => console.warn(message, context),
    error: (message, context) => console.error(message, context),
    info: (message, context) => console.info?.(message, context),
    debug: (message, context) => console.debug?.(message, context),
};
function decodePotentialBase64(raw, logger) {
    const trimmed = raw.trim();
    if (!trimmed) {
        return trimmed;
    }
    const base64Pattern = /^[A-Za-z0-9+/=]+$/;
    const looksLikeBase64 = base64Pattern.test(trimmed.replace(/\s+/g, "")) && trimmed.length % 4 === 0;
    if (looksLikeBase64) {
        try {
            return Buffer.from(trimmed, "base64").toString("utf-8");
        }
        catch (error) {
            logger.warn("Failed to decode base64 service account payload", { error });
        }
    }
    return trimmed;
}
function normalizePrivateKey(key) {
    return key.replace(/\\n/g, "\n");
}
function parseServiceAccountPayload(payload, source, logger) {
    try {
        const decoded = decodePotentialBase64(payload, logger);
        const parsed = JSON.parse(decoded);
        if (!parsed.client_email || !parsed.private_key) {
            throw new Error("Missing client_email or private_key");
        }
        return {
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: normalizePrivateKey(parsed.private_key),
        };
    }
    catch (error) {
        logger.error("Unable to parse service account payload", { source, error });
        return undefined;
    }
}
function resolveServiceAccountFromCandidates(candidates, logger) {
    for (const candidate of candidates) {
        if (candidate.value) {
            const serviceAccount = parseServiceAccountPayload(candidate.value, candidate.source, logger);
            if (serviceAccount) {
                return serviceAccount;
            }
        }
    }
    return undefined;
}
export function loadServiceAccount(options = {}) {
    const logger = options.logger ?? defaultLogger;
    const env = options.env ?? process.env;
    const readFile = options.readFile ?? ((path) => readFileSync(path, "utf-8"));
    const exists = options.exists ?? existsSync;
    const candidates = [
        { value: env.FIREBASE_SERVICE_ACCOUNT, source: "FIREBASE_SERVICE_ACCOUNT" },
        { value: env.SERVICE_ACCOUNT_JSON, source: "SERVICE_ACCOUNT_JSON" },
        { value: env.GOOGLE_APPLICATION_CREDENTIALS_JSON, source: "GOOGLE_APPLICATION_CREDENTIALS_JSON" },
    ];
    const fromEnv = resolveServiceAccountFromCandidates(candidates, logger);
    if (fromEnv) {
        return fromEnv;
    }
    const credentialsPath = env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentialsPath && exists(credentialsPath)) {
        try {
            const fileContent = readFile(credentialsPath);
            return parseServiceAccountPayload(fileContent, "GOOGLE_APPLICATION_CREDENTIALS file", logger);
        }
        catch (error) {
            logger.error("Unable to load service account from file", { error, credentialsPath });
        }
    }
    return undefined;
}
export function initializeFirebaseAdminApp(options = {}) {
    const logger = options.logger ?? defaultLogger;
    const targetAppName = options.appName ?? "[DEFAULT]";
    const existing = admin.apps.find((appInstance) => appInstance?.name === targetAppName);
    if (existing) {
        return existing;
    }
    const serviceAccount = options.credential
        ? undefined
        : loadServiceAccount({
            logger,
            env: options.env,
            readFile: options.readFile,
            exists: options.exists,
        });
    const appOptions = {
        ...options.appOptions,
    };
    if (options.credential) {
        appOptions.credential = options.credential;
    }
    else if (serviceAccount) {
        appOptions.credential = admin.credential.cert(serviceAccount);
        if (serviceAccount.projectId && !appOptions.projectId) {
            appOptions.projectId = serviceAccount.projectId;
        }
    }
    else {
        logger.warn("Initializing Firebase Admin app without explicit service account; relying on default credentials");
    }
    return admin.initializeApp(appOptions, targetAppName);
}
export function getFirestore(app) {
    if (app) {
        return admin.firestore(app);
    }
    if (admin.apps.length === 0) {
        throw new Error("Firebase Admin app has not been initialized. Call initializeFirebaseAdminApp first.");
    }
    return admin.firestore(admin.app());
}
//# sourceMappingURL=index.js.map