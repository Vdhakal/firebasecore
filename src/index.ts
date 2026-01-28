import * as admin from "firebase-admin";
import type {AppOptions, ServiceAccount} from "firebase-admin";
import type {App} from "firebase-admin/app";
import {existsSync, readFileSync} from "node:fs";

export interface FirebaseCoreLogger {
	debug?: (message: string, context?: Record<string, unknown>) => void;
	info?: (message: string, context?: Record<string, unknown>) => void;
	warn: (message: string, context?: Record<string, unknown>) => void;
	error: (message: string, context?: Record<string, unknown>) => void;
}

const defaultLogger: FirebaseCoreLogger = {
	warn: (message, context) => console.warn(message, context),
	error: (message, context) => console.error(message, context),
	info: (message, context) => console.info?.(message, context),
	debug: (message, context) => console.debug?.(message, context),
};

export interface ServiceAccountSource {
	value?: string;
	source: string;
}

export interface ServiceAccountLoaderOptions {
	env?: NodeJS.ProcessEnv;
	logger?: FirebaseCoreLogger;
	readFile?: (path: string) => string;
	exists?: (path: string) => boolean;
}

function decodePotentialBase64(raw: string, logger: FirebaseCoreLogger): string {
	const trimmed = raw.trim();
	if (!trimmed) {
		return trimmed;
	}

	const base64Pattern = /^[A-Za-z0-9+/=]+$/;
	const looksLikeBase64 = base64Pattern.test(trimmed.replace(/\s+/g, "")) && trimmed.length % 4 === 0;
	if (looksLikeBase64) {
		try {
			return Buffer.from(trimmed, "base64").toString("utf-8");
		} catch (error) {
			logger.warn("Failed to decode base64 service account payload", {error});
		}
	}

	return trimmed;
}

function normalizePrivateKey(key: string) {
	return key.replace(/\\n/g, "\n");
}

function parseServiceAccountPayload(payload: string, source: string, logger: FirebaseCoreLogger): ServiceAccount | undefined {
	try {
		const decoded = decodePotentialBase64(payload, logger);
		const parsed = JSON.parse(decoded) as {
			project_id?: string;
			client_email?: string;
			private_key?: string;
		};

		if (!parsed.client_email || !parsed.private_key) {
			throw new Error("Missing client_email or private_key");
		}

		return {
			projectId: parsed.project_id,
			clientEmail: parsed.client_email,
			privateKey: normalizePrivateKey(parsed.private_key),
		};
	} catch (error) {
		logger.error("Unable to parse service account payload", {source, error});
		return undefined;
	}
}

function resolveServiceAccountFromCandidates(
	candidates: ServiceAccountSource[],
	logger: FirebaseCoreLogger,
): ServiceAccount | undefined {
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

export function loadServiceAccount(options: ServiceAccountLoaderOptions = {}): ServiceAccount | undefined {
	const logger = options.logger ?? defaultLogger;
	const env = options.env ?? process.env;
	const readFile = options.readFile ?? ((path: string) => readFileSync(path, "utf-8"));
	const exists = options.exists ?? existsSync;

	const candidates: ServiceAccountSource[] = [
		{value: env.FIREBASE_SERVICE_ACCOUNT, source: "FIREBASE_SERVICE_ACCOUNT"},
		{value: env.SERVICE_ACCOUNT_JSON, source: "SERVICE_ACCOUNT_JSON"},
		{value: env.GOOGLE_APPLICATION_CREDENTIALS_JSON, source: "GOOGLE_APPLICATION_CREDENTIALS_JSON"},
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
		} catch (error) {
			logger.error("Unable to load service account from file", {error, credentialsPath});
		}
	}

	return undefined;
}

export interface InitializeFirebaseAdminOptions extends ServiceAccountLoaderOptions {
	appName?: string;
	appOptions?: Omit<AppOptions, "credential">;
	credential?: AppOptions["credential"];
}

function resolveAdminNamespace() {
	const resolved = (admin as unknown as {default?: typeof admin}).default ?? admin;
	return resolved as typeof admin;
}

export function initializeFirebaseAdminApp(options: InitializeFirebaseAdminOptions = {}): App {
	const resolvedAdmin = resolveAdminNamespace();
	const logger = options.logger ?? defaultLogger;
	const targetAppName = options.appName ?? "[DEFAULT]";
	const existing = resolvedAdmin.apps.find((appInstance) => appInstance?.name === targetAppName);
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

	const appOptions: AppOptions = {
		...options.appOptions,
	};

	if (options.credential) {
		appOptions.credential = options.credential;
	} else if (serviceAccount) {
		appOptions.credential = resolvedAdmin.credential.cert(serviceAccount);
		if (serviceAccount.projectId && !appOptions.projectId) {
			appOptions.projectId = serviceAccount.projectId;
		}
	} else {
		logger.warn("Initializing Firebase Admin app without explicit service account; relying on default credentials");
	}

	return resolvedAdmin.initializeApp(appOptions, targetAppName);
}

export function getFirestore(app?: App) {
	const resolvedAdmin = resolveAdminNamespace();
	if (app) {
		return resolvedAdmin.firestore(app);
	}

	if (resolvedAdmin.apps.length === 0) {
		throw new Error("Firebase Admin app has not been initialized. Call initializeFirebaseAdminApp first.");
	}

	return resolvedAdmin.firestore(resolvedAdmin.app());
}

export type {ServiceAccount};