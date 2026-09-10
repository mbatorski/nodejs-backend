import Route from "../../../lib/routes/interfaces/Route";
import Integrations from "../../services/Integrations";
import IntegrationsApiKeys from "../../services/IntegrationsApiKeys";
import IntegrationsHistory from "../../services/IntegrationsHistory";
import { applyPlaceholders, getByPath, readUsageFromHeaders, type PayloadSample } from "../../utils/PayloadUtil";

function toResponseText(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value === "string") return value;

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

export default new Route()
.setBody({
    integrationId: { type: "number" },
    prompt: { type: "anystring", minLength: 1 },
})
.post(async function(res, body) {
    const { integrationId, prompt } = body;

    if (!Integrations.has(integrationId)) return res.error(404, "Integration not found");

    const integration = Integrations.get(integrationId);
    const availableKeys = await IntegrationsApiKeys.getAvailableByIntegrationId(integrationId);

    if (availableKeys.length === 0) {
        return res.error(503, "No available API keys for this integration");
    }

    const placeholdersBase = {
        "{PROMPT}": prompt,
    };

    let lastError = "All API keys failed";

    for (const apiKey of availableKeys) {
        const placeholders = {
            ...placeholdersBase,
            "{API_KEY}": apiKey.key,
        };

        const prepared = applyPlaceholders(
            integration.payloadSample,
            placeholders
        ) as PayloadSample;

        const headers = Object.fromEntries(
            Object.entries(prepared.headers).map(([header, value]) => [header, String(value)])
        );

        try {
            const response = await fetch(prepared.url, {
                method: "POST",
                headers,
                body:
                    typeof prepared.body === "string"
                        ? prepared.body
                        : JSON.stringify(prepared.body),
            });

            const raw = await response.text();
            let data: unknown = raw;

            try {
                data = JSON.parse(raw);
            } catch {}

            const usageFromHeaders = readUsageFromHeaders(response.headers, integration.usageHeaders);
            console.log(response.headers);
            
            console.log(usageFromHeaders);
            
            if (usageFromHeaders) {
                await IntegrationsApiKeys.applyUsageFromHeaders(apiKey.id, usageFromHeaders);
            }

            if (!response.ok) {
                lastError = `Upstream returned status ${response.status}`;

                await IntegrationsHistory.create({
                    integrationId,
                    apiKeyId: apiKey.id,
                    prompt,
                    response: raw || null,
                    success: false,
                    statusCode: response.status,
                    error: lastError,
                });

                continue;
            }

            const extracted = getByPath(data, integration.resultPath);
            const responseText = toResponseText(extracted) ?? raw;

            await IntegrationsHistory.create({
                integrationId,
                apiKeyId: apiKey.id,
                prompt,
                response: responseText,
                success: true,
                statusCode: response.status,
            });

            return res.send({
                apiKeyId: apiKey.id,
                statusCode: response.status,
                response: responseText,
            });
        } catch (error) {
            lastError = error instanceof Error ? error.message : "Request failed";

            await IntegrationsHistory.create({
                integrationId,
                apiKeyId: apiKey.id,
                prompt,
                response: null,
                success: false,
                statusCode: null,
                error: lastError,
            });
        }
    }

    return res.error(502, lastError);
});
