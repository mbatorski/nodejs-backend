import Route from "../../../../lib/routes/interfaces/Route";
import IntegrationsApiKeys from "../../../services/IntegrationsApiKeys";
import IntegrationsHistory from "../../../services/IntegrationsHistory";

export default new Route()
.setBody({
    id: { type: "number" },
})
.delete(async function(res, body) {
    const { id } = body;

    if (!IntegrationsApiKeys.has(id)) return res.error(404, "API key not found");

    IntegrationsHistory.deleteByApiKeyId(id);
    IntegrationsApiKeys.delete(id);

    res.sendStatus(200);
});
