import path from "path";
import dotenv from "dotenv";
import Db from "./lib/database/Database";
import RouteServer from "./lib/routes/objects/RouteServer";
import Users from "./src/services/Users";
import Integrations from "./src/services/Integrations";
import IntegrationsApiKeys from "./src/services/IntegrationsApiKeys";
import IntegrationsHistory from "./src/services/IntegrationsHistory";

process.env.TZ = "Europe/Warsaw";

dotenv.config();

const server = new RouteServer();

Db.setKeepAliveTable("alive");

Db.onConnect(async () => {
    await Users.load();
    await Integrations.load();
    await IntegrationsApiKeys.load();
    await IntegrationsHistory.load();

    server.static("/assets", "assets");
    server.setEndpointPrefix("/api");
    server.initRoutes(path.join(__dirname, "src/routes"));
    server.start(process.env.APP_PORT!);
    server.setTempFilesUploadDir("./assets/private/temp");
});
