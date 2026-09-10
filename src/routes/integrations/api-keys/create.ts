import Route from "../../../../lib/routes/interfaces/Route";
import Integrations from "../../../services/Integrations";
import IntegrationsApiKeys from "../../../services/IntegrationsApiKeys";

export default new Route()
.setBody({
    integrationId: { type: "number" },
    key: { type: "anystring", minLength: 1 },
    resetsAt: { type: "number", optional: true, nullable: true },
    note: { type: "anystring", maxLength: 255, optional: true },
})
.post(async function(res, body) {
    const { integrationId, key, resetsAt, note } = body;

    if (!Integrations.has(integrationId)) return res.error(404, "Integration not found");

    const apiKey = await IntegrationsApiKeys.create({
        integrationId,
        key,
        resetsAt: resetsAt ?? null,
        note,
    });

    res.send(apiKey);
});
