import dotenv from "dotenv";
import Route from "../../../lib/routes/interfaces/Route";
import Users from "../../services/Users";

dotenv.config();

export default new Route()
.setBody({
    username: { type: "string", minLength: 3, maxLength: 30 },
    password: { type: "string", minLength: 3, maxLength: 100 },
})
.post(async function(res, body) {
    const { username, password } = body;

    const user = await Users.getByUsername(username);

    if (!user) return res.error(404, "User not found");

    const arePasswordsEqual = await Users.arePasswordsEqual(password, user.password);

    if (!arePasswordsEqual) return res.error(401, "Invalid password");

    const token = Users.signJWTToken(user);

    res._res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.ENV_TYPE === "prod",
    });
    res.sendStatus(200);
});
