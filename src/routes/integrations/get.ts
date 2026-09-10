import Route from "../../../lib/routes/interfaces/Route";
import Integrations from "../../services/Integrations";

export default new Route()
.setQuery({
    id: { type: "number" },
})
.get(async function(res, _, query) {
    const { id } = query;

    if (!Integrations.has(id)) return res.error(404, "Integration not found");

    res.send(Integrations.get(id));
});
