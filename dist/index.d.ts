import * as admin from "firebase-admin";
import type { AppOptions, ServiceAccount } from "firebase-admin";
import type { App } from "firebase-admin/app";
export interface FirebaseCoreLogger {
    debug?: (message: string, context?: Record<string, unknown>) => void;
    info?: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
}
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
export declare function loadServiceAccount(options?: ServiceAccountLoaderOptions): ServiceAccount | undefined;
export interface InitializeFirebaseAdminOptions extends ServiceAccountLoaderOptions {
    appName?: string;
    appOptions?: Omit<AppOptions, "credential">;
    credential?: AppOptions["credential"];
}
export declare function initializeFirebaseAdminApp(options?: InitializeFirebaseAdminOptions): App;
export declare function getFirestore(app?: App): admin.firestore.Firestore;
export type { ServiceAccount };
//# sourceMappingURL=index.d.ts.map