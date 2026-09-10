import Route from "../../../../lib/routes/interfaces/Route";
import IntegrationsApiKeys from "../../../services/IntegrationsApiKeys";
import IntegrationsHistory from "../../../services/IntegrationsHistory";

export default new Route()
.setQuery({
    id: { type: "number", optional: true },
    integrationId: { type: "number", optional: true },
})
.get(async function(res, _, query) {
    const { id, integrationId } = query;

    if (id !== undefined) {
        if (!IntegrationsApiKeys.has(id)) return res.error(404, "API key not found");

        const apiKey = IntegrationsApiKeys.get(id);
        const historyStats = IntegrationsHistory.getApiKeyStats(id);

        return res.send({
            ...historyStats,
            usage: apiKey.usage,
            limit: apiKey.limit,
            resetsAt: apiKey.resetsAt,
            remaining: Math.max(apiKey.limit - apiKey.usage, 0),
        });
    }

    const keys =
        integrationId !== undefined
            ? IntegrationsApiKeys.getByIntegrationId(integrationId)
            : IntegrationsApiKeys.getAll();

    res.send(
        keys.map((apiKey) => {
            const historyStats = IntegrationsHistory.getApiKeyStats(apiKey.id);

            return {
                ...historyStats,
                usage: apiKey.usage,
                limit: apiKey.limit,
                resetsAt: apiKey.resetsAt,
                remaining: Math.max(apiKey.limit - apiKey.usage, 0),
            };
        })
    );
});
