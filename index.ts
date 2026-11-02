import path from "path";
import dotenv from "dotenv";
import Db from "./lib/database/Database";
import RouteServer from "./lib/routes/objects/RouteServer";

process.env.TZ = "Europe/Warsaw";

dotenv.config();

const server = new RouteServer();

Db.setKeepAliveTable("alive");

Db.onConnect(async () => {
    server.static("/assets", "assets");
    server.setEndpointPrefix("/api");
    server.initRoutes(path.join(__dirname, "src/routes"));
    server.start(process.env.APP_PORT!);
    server.setTempFilesUploadDir("./assets/private/temp");
});
