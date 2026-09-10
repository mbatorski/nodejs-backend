import Route from "../../../lib/routes/interfaces/Route";
import Integrations from "../../services/Integrations";

export default new Route()
.get(async function(res) {
    res.send(Integrations.getAll());
});
