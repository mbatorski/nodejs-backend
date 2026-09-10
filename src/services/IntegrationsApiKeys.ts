import { Service } from "../../lib/service/Service";

type IntegrationApiKey = {
    id: number;
    integrationId: number;
    key: string;
    usage: number;
    limit: number;
    resetsAt: number | null;
    note: string;
    createdAt: number;
    updatedAt: number;
};

class IntegrationsApiKeysService extends Service<IntegrationApiKey> {
    constructor() {
        super({
            table: "integrations_api_keys",
            identifier: "id",
            identifierType: "number",
            create: (row) => ({
                ...row,
                resets_at: row.resets_at ?? null,
            }),
            save: (obj) => ({
                ...obj,
                resetsAt: obj.resetsAt ?? null,
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

    async ensureUsageReset(id: number) {
        const apiKey = this._get(id);
        const now = new Date().getTime();

        if (apiKey.resetsAt === null || now < apiKey.resetsAt || apiKey.usage === 0) {
            return apiKey;
        }

        return this._update(
            id,
            this._overwrite(id, {
                usage: 0,
                updatedAt: now,
            })
        );
    }

    async getAvailableByIntegrationId(integrationId: number) {
        const keys = this.getByIntegrationId(integrationId);
        const available: IntegrationApiKey[] = [];

        for (const key of keys) {
            const current = await this.ensureUsageReset(key.id);

            if (current.limit > 0 && current.usage >= current.limit) continue;

            available.push(current);
        }

        return available;
    }

    async create(data: {
        integrationId: number;
        key: string;
        resetsAt?: number | null;
        note?: string;
    }) {
        const id = await this._getNextId();
        const now = new Date().getTime();

        return this._insert(id, {
            id,
            integrationId: data.integrationId,
            key: data.key,
            usage: 0,
            limit: 0,
            resetsAt: data.resetsAt ?? null,
            note: data.note ?? "",
            createdAt: now,
            updatedAt: now,
        });
    }

    async edit(
        id: number,
        data: {
            key?: string;
            resetsAt?: number | null;
            note?: string;
        }
    ) {
        const patch = Object.fromEntries(
            Object.entries({
                ...data,
                updatedAt: new Date().getTime(),
            }).filter(([, value]) => value !== undefined)
        );

        return this._update(id, this._overwrite(id, patch));
    }

    async applyUsageFromHeaders(
        id: number,
        data: { usage: number; limit: number; resetsAt: number | null }
    ) {
        const patch: Partial<IntegrationApiKey> = {
            usage: data.usage,
            limit: data.limit,
            updatedAt: new Date().getTime(),
        };

        if (data.resetsAt !== null) {
            patch.resetsAt = data.resetsAt;
        }

        return this._update(id, this._overwrite(id, patch));
    }

    delete(id: number) {
        this._delete(id);
    }

    deleteByIntegrationId(integrationId: number) {
        for (const apiKey of this.getByIntegrationId(integrationId)) {
            this._delete(apiKey.id);
        }
    }
}

const IntegrationsApiKeys = new IntegrationsApiKeysService();

export default IntegrationsApiKeys;
export type { IntegrationApiKey };
