import { Service } from "../../lib/service/Service";
import {
    parseJsonField,
    stringifyJsonField,
    type PayloadSample,
    type UsageHeaderNames,
} from "../utils/PayloadUtil";

type Integration = {
    id: number;
    name: string;
    payloadSample: PayloadSample;
    resultPath: string | null;
    usageHeaders: UsageHeaderNames | null;
    createdAt: number;
    updatedAt: number;
};

class IntegrationsService extends Service<Integration> {
    constructor() {
        super({
            table: "integrations",
            identifier: "id",
            identifierType: "number",
            create: (row) => ({
                ...row,
                payload_sample: parseJsonField(row.payload_sample),
                usage_headers: parseJsonField(row.usage_headers) ?? null,
            }),
            save: (obj) => ({
                ...obj,
                payloadSample: stringifyJsonField(obj.payloadSample),
                usageHeaders: obj.usageHeaders === null ? null : stringifyJsonField(obj.usageHeaders),
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

    async create(data: {
        name: string;
        payloadSample: PayloadSample;
        resultPath?: string | null;
        usageHeaders?: UsageHeaderNames | null;
    }) {
        const id = await this._getNextId();
        const now = new Date().getTime();

        return this._insert(id, {
            name: data.name,
            payloadSample: data.payloadSample,
            resultPath: data.resultPath ?? null,
            usageHeaders: data.usageHeaders ?? null,
            id,
            createdAt: now,
            updatedAt: now,
        });
    }

    async edit(
        id: number,
        data: {
            name?: string;
            payloadSample?: PayloadSample;
            resultPath?: string | null;
            usageHeaders?: UsageHeaderNames | null;
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

    delete(id: number) {
        this._delete(id);
    }
}

const Integrations = new IntegrationsService();

export default Integrations;
export type { Integration };
