export type PayloadSample = {
    url: string;
    headers: Record<string, string>;
    body: unknown;
};

export type UsageHeaderNames = {
    limit: string | null;
    remaining: string | null;
    reset: string | null;
};

export function applyPlaceholders(value: unknown, placeholders: Record<string, string>): unknown {
    if (typeof value === "string") {
        let result = value;

        for (const [token, replacement] of Object.entries(placeholders)) {
            result = result.split(token).join(replacement);
        }

        return result;
    }

    if (Array.isArray(value)) {
        return value.map((entry) => applyPlaceholders(entry, placeholders));
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [
                key,
                applyPlaceholders(entry, placeholders),
            ])
        );
    }

    return value;
}

export function parseJsonField(value: unknown) {
    if (typeof value !== "string") return value;

    return JSON.parse(value);
}

export function stringifyJsonField(value: unknown) {
    if (typeof value === "string") return value;

    return JSON.stringify(value);
}

export function validatePayloadSample(value: unknown): string | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return "Param \"payloadSample\" has to be an object";
    }

    const sample = value as Record<string, unknown>;

    if (typeof sample.url !== "string" || sample.url.length === 0) {
        return "Param \"payloadSample.url\" has to be a non-empty string";
    }

    if (!sample.headers || typeof sample.headers !== "object" || Array.isArray(sample.headers)) {
        return "Param \"payloadSample.headers\" has to be an object";
    }

    if (!("body" in sample)) {
        return "Param \"payloadSample.body\" is required";
    }

    return null;
}

export function validateResultPath(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") return "Param \"resultPath\" has to be a string or null";
    if (value.length > 255) return "Param \"resultPath\" must have maximum length of 255 characters";

    return null;
}

export function validateUsageHeaderNames(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== "object" || Array.isArray(value)) {
        return "Param \"usageHeaders\" has to be an object";
    }

    const names = value as Record<string, unknown>;

    for (const key of ["limit", "remaining", "reset"] as const) {
        const entry = names[key];

        if (entry !== undefined && entry !== null && typeof entry !== "string") {
            return `Param "usageHeaders.${key}" has to be a string or null`;
        }
    }

    return null;
}

export function normalizeUsageHeaderNames(value: unknown): UsageHeaderNames | null {
    if (value === undefined || value === null) return null;

    const names = value as Record<string, unknown>;
    const pick = (key: "limit" | "remaining" | "reset") =>
        typeof names[key] === "string" && (names[key] as string).length > 0
            ? (names[key] as string)
            : null;

    return {
        limit: pick("limit"),
        remaining: pick("remaining"),
        reset: pick("reset"),
    };
}

export function getByPath(data: unknown, path: string | null | undefined): unknown {
    if (!path) return data;

    return path.split(".").reduce<unknown>((acc, key) => {
        if (acc === null || typeof acc !== "object") return undefined;
        return (acc as Record<string, unknown>)[key];
    }, data);
}

function headerValueMap(headers: Headers | Record<string, string>): Map<string, string> {
    const map = new Map<string, string>();
    const entries =
        typeof (headers as Headers).forEach === "function"
            ? (() => {
                  const list: [string, string][] = [];
                  (headers as Headers).forEach((value, key) => list.push([key, value]));
                  return list;
              })()
            : Object.entries(headers as Record<string, string>);

    for (const [key, value] of entries) {
        if (value == null) continue;
        map.set(key.trim().toLowerCase(), String(value).trim());
    }

    return map;
}

export function readUsageFromHeaders(
    headers: Headers | Record<string, string>,
    names: UsageHeaderNames | null | undefined
) {
    if (!names?.limit || !names?.remaining) return null;

    const map = headerValueMap(headers);
    const limitRaw = map.get(names.limit.trim().toLowerCase());
    const remainingRaw = map.get(names.remaining.trim().toLowerCase());

    if (limitRaw === undefined || remainingRaw === undefined) return null;

    const limit = Number(limitRaw);
    const remaining = Number(remainingRaw);

    if (!Number.isFinite(limit) || !Number.isFinite(remaining)) return null;

    const resetRaw = names.reset ? map.get(names.reset.trim().toLowerCase()) : undefined;
    const resetSeconds = resetRaw === undefined ? null : Number(resetRaw);
    const resetsAt =
        resetSeconds !== null && Number.isFinite(resetSeconds)
            ? new Date().getTime() + resetSeconds * 1000
            : null;

    return {
        limit,
        usage: Math.max(limit - remaining, 0),
        resetsAt,
    };
}
