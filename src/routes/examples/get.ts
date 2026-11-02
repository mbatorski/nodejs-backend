import dotenv from "dotenv";
import Route from "../../../lib/routes/interfaces/Route";
import Examples from "../../services/ExampleAsyncService";

dotenv.config();

export default new Route()
.setQuery({
    id: { type: "number" },
})
.setServiceObjectFetch(Examples)
.get(async function(res) {
    res.send(this.serviceObject);
});
