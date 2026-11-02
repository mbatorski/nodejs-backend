import dotenv from "dotenv";
import Route from "../../../lib/routes/interfaces/Route";
import Examples from "../../services/ExampleAsyncService";

dotenv.config();

export default new Route()
.setBody({
    name: { type: "string", minLength: 1, maxLength: 100 },
})
.post(async function(res, body) {
    const { name } = body;

    const example = await Examples.create({ name });

    res.send(example);
});
