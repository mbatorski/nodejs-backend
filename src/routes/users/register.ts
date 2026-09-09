import dotenv from "dotenv";
import Route from "../../../lib/routes/interfaces/Route";
import Users from "../../services/Users";

dotenv.config();

export default new Route()
.setBody({
    username: { type: "string", minLength: 3, maxLength: 30 },
    password: { type: "string", minLength: 3, maxLength: 100 },
    firstname: { type: "string", minLength: 1, maxLength: 50 },
    lastname: { type: "string", minLength: 1, maxLength: 50 },
})
.post(async function(res, body) {
    const { username, password, firstname, lastname } = body;

    if (Users.getByUsername(username)) return res.error(409, "User already exists");

    const user = await Users.create({
        username,
        password,
        firstname,
        lastname,
    });

    const token = Users.signJWTToken(user);

    res._res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.ENV_TYPE === "prod",
    });
    res.sendStatus(200);
});
