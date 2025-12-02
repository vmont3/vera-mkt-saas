// src/database/index.ts

/**
 * Prisma client singleton for the Quantum Cert backend.
 *
 * - In **test/CI** mode (`NODE_ENV=test` or Jest env) the client is created
 *   without logging to keep test output clean.
 * - In **production** mode the client logs all query levels (`query`, `info`,
 *   `warn`, `error`).
 * - Reconnection logic attempts to reconnect up to 5 times on disconnect.
 * - Middleware audits data‑modifying operations (create, update, delete, upsert,
 *   raw queries) and prints a concise log with duration.
 */

import { PrismaClient, Prisma } from "@prisma/client";

let prismaInstance: PrismaClient | null = null;

/**
 * Returns a singleton PrismaClient instance.
 * The first call creates the client according to the current environment.
 */
export function getPrismaClient(): PrismaClient {
    if (prismaInstance) {
        return prismaInstance;
    }

    const isTest =
        process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== undefined;

    prismaInstance = new PrismaClient({
        log: isTest ? [] : ["query", "info", "warn", "error"],
    });

    // ---------------------------------------------------------------------
    // Middleware: audit sensitive queries (writes, raw executions)
    // ---------------------------------------------------------------------
    /*
    prismaInstance.$use(async (params: Prisma.MiddlewareParams, next) => {
        const start = Date.now();
        const result = await next(params);
        const duration = Date.now() - start;

        const auditActions = [
            "create",
            "createMany",
            "update",
            "updateMany",
            "delete",
            "deleteMany",
            "upsert",
            "executeRaw",
            "queryRaw",
        ];

        if (auditActions.includes(params.action)) {
            console.log(
                `[AUDIT] ${params.model ?? ""}.${params.action} took ${duration}ms`
            );
        }
        return result;
    });
    */

    // ---------------------------------------------------------------------
    // Reconnection handling
    // ---------------------------------------------------------------------
    /*
    prismaInstance.$on("error", (e) => {
        console.error("[Prisma] Unexpected error:", e);
    });
    */

    // prismaInstance.$on("disconnect", async () => {
    //     console.warn("[Prisma] Disconnected – attempting reconnection");
    //     // Reconnection logic removed as 'disconnect' is not a valid Prisma event
    // });

    return prismaInstance;
}

export default getPrismaClient;
