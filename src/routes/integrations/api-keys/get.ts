import Route from "../../../../lib/routes/interfaces/Route";
import IntegrationsApiKeys from "../../../services/IntegrationsApiKeys";

export default new Route()
.setQuery({
    id: { type: "number" },
})
.get(async function(res, _, query) {
    const { id } = query;

    if (!IntegrationsApiKeys.has(id)) return res.error(404, "API key not found");

    res.send(IntegrationsApiKeys.get(id));
});
