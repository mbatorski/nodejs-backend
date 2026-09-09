import dotenv from "dotenv";
import Route from "../../../lib/routes/interfaces/Route";

dotenv.config();

export default new Route()
.jwt()
.post(async function(res) {
    res.sendStatus(200);
});
