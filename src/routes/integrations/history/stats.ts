import Route from "../../../../lib/routes/interfaces/Route";
import Integrations from "../../../services/Integrations";
import IntegrationsHistory from "../../../services/IntegrationsHistory";

export default new Route()
.setQuery({
    integrationId: { type: "number" },
})
.get(async function(res, _, query) {
    const { integrationId } = query;

    if (!Integrations.has(integrationId)) return res.error(404, "Integration not found");

    res.send(IntegrationsHistory.getIntegrationStats(integrationId));
});
