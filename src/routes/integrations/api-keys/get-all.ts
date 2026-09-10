import Route from "../../../../lib/routes/interfaces/Route";
import Integrations from "../../../services/Integrations";
import IntegrationsApiKeys from "../../../services/IntegrationsApiKeys";

export default new Route()
.setQuery({
    integrationId: { type: "number", optional: true },
})
.get(async function(res, _, query) {
    const { integrationId } = query;

    if (integrationId === undefined) {
        return res.send(IntegrationsApiKeys.getAll());
    }

    if (!Integrations.has(integrationId)) return res.error(404, "Integration not found");

    res.send(IntegrationsApiKeys.getByIntegrationId(integrationId));
});
