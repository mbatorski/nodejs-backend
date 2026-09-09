import dotenv from "dotenv";
import Route from "../../../lib/routes/interfaces/Route";
import Users from "../../services/Users";

dotenv.config();

export default new Route()
.setServiceObjectFetch(Users)
.post(async function(res, a, b, c, d, e) {
    res._res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0),
    });
    res.sendStatus(200);
});
