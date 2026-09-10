import Route from "../../../../lib/routes/interfaces/Route";
import IntegrationsApiKeys from "../../../services/IntegrationsApiKeys";

export default new Route()
.setBody({
    id: { type: "number" },
    key: { type: "anystring", minLength: 1, optional: true },
    resetsAt: { type: "number", optional: true, nullable: true },
    note: { type: "anystring", maxLength: 255, optional: true },
})
.put(async function(res, body) {
    const { id, key, resetsAt, note } = body;

    if (!IntegrationsApiKeys.has(id)) return res.error(404, "API key not found");

    const apiKey = await IntegrationsApiKeys.edit(id, {
        key,
        resetsAt,
        note,
    });

    res.send(apiKey);
});
