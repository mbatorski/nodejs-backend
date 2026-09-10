import { Service } from "../../lib/service/Service";

type IntegrationHistoryEntry = {
    id: number;
    integrationId: number;
    apiKeyId: number;
    prompt: string;
    response: string | null;
    success: number;
    statusCode: number | null;
    error: string | null;
    createdAt: number;
};

class IntegrationsHistoryService extends Service<IntegrationHistoryEntry> {
    constructor() {
        super({
            table: "integrations_history",
            identifier: "id",
            identifierType: "number",
            create: (row) => ({
                ...row,
                response: row.response ?? null,
                status_code: row.status_code ?? null,
                error: row.error ?? null,
            }),
            save: (obj) => ({
                ...obj,
                response: obj.response ?? null,
                statusCode: obj.statusCode ?? null,
                error: obj.error ?? null,
            }),
            update: (obj) =>
                this._reduce(obj, ["id", "createdAt"]),
        });
    }

    get(id: number) {
        return this._get(id);
    }

    has(id: number) {
        return this._has(id);
    }

    getAll() {
        return this._values();
    }

    getByIntegrationId(integrationId: number) {
        return this._values().filter((entry) => entry.integrationId === integrationId);
    }

    getByApiKeyId(apiKeyId: number) {
        return this._values().filter((entry) => entry.apiKeyId === apiKeyId);
    }

    async create(data: {
        integrationId: number;
        apiKeyId: number;
        prompt: string;
        success: boolean;
        response?: string | null;
        statusCode?: number | null;
        error?: string | null;
    }) {
        const id = await this._getNextId();

        return this._insert(id, {
            id,
            integrationId: data.integrationId,
            apiKeyId: data.apiKeyId,
            prompt: data.prompt,
            response: data.response ?? null,
            success: data.success ? 1 : 0,
            statusCode: data.statusCode ?? null,
            error: data.error ?? null,
            createdAt: new Date().getTime(),
        });
    }

    delete(id: number) {
        this._delete(id);
    }

    deleteByIntegrationId(integrationId: number) {
        for (const entry of this.getByIntegrationId(integrationId)) {
            this._delete(entry.id);
        }
    }

    deleteByApiKeyId(apiKeyId: number) {
        for (const entry of this.getByApiKeyId(apiKeyId)) {
            this._delete(entry.id);
        }
    }

    getApiKeyStats(apiKeyId: number) {
        const entries = this.getByApiKeyId(apiKeyId);
        const success = entries.filter((entry) => entry.success === 1).length;

        return {
            apiKeyId,
            total: entries.length,
            success,
            failed: entries.length - success,
        };
    }

    getIntegrationStats(integrationId: number) {
        const entries = this.getByIntegrationId(integrationId);
        const success = entries.filter((entry) => entry.success === 1).length;
        const byApiKey: Record<number, { total: number; success: number; failed: number }> = {};

        for (const entry of entries) {
            if (!byApiKey[entry.apiKeyId]) {
                byApiKey[entry.apiKeyId] = { total: 0, success: 0, failed: 0 };
            }

            byApiKey[entry.apiKeyId].total += 1;

            if (entry.success === 1) byApiKey[entry.apiKeyId].success += 1;
            else byApiKey[entry.apiKeyId].failed += 1;
        }

        return {
            integrationId,
            total: entries.length,
            success,
            failed: entries.length - success,
            byApiKey,
        };
    }
}

const IntegrationsHistory = new IntegrationsHistoryService();

export default IntegrationsHistory;
export type { IntegrationHistoryEntry };
