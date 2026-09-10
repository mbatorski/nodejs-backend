import Route from "../../../lib/routes/interfaces/Route";
import Integrations from "../../services/Integrations";
import IntegrationsApiKeys from "../../services/IntegrationsApiKeys";
import IntegrationsHistory from "../../services/IntegrationsHistory";

export default new Route()
.setBody({
    id: { type: "number" },
})
.delete(async function(res, body) {
    const { id } = body;

    if (!Integrations.has(id)) return res.error(404, "Integration not found");

    IntegrationsHistory.deleteByIntegrationId(id);
    IntegrationsApiKeys.deleteByIntegrationId(id);
    Integrations.delete(id);

    res.sendStatus(200);
});
