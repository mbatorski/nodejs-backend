import Route from "../../../../lib/routes/interfaces/Route";
import Integrations from "../../../services/Integrations";
import IntegrationsApiKeys from "../../../services/IntegrationsApiKeys";
import IntegrationsHistory from "../../../services/IntegrationsHistory";

export default new Route()
.setQuery({
    integrationId: { type: "number", optional: true },
    apiKeyId: { type: "number", optional: true },
})
.get(async function(res, _, query) {
    const { integrationId, apiKeyId } = query;

    if (apiKeyId !== undefined) {
        if (!IntegrationsApiKeys.has(apiKeyId)) return res.error(404, "API key not found");

        return res.send(IntegrationsHistory.getByApiKeyId(apiKeyId));
    }

    if (integrationId !== undefined) {
        if (!Integrations.has(integrationId)) return res.error(404, "Integration not found");

        return res.send(IntegrationsHistory.getByIntegrationId(integrationId));
    }

    res.send(IntegrationsHistory.getAll());
});
