import express, { type Express, type Request, type Response as ExpressResponse, type NextFunction } from "express";
import cors from "cors";
import path from "path";
import formidable from "formidable";
import dotenv from "dotenv";

import {
    getFiles,
    removeExtension,
    slashesToBackslashes,
    removeDirUnnecessarySlashes,
    backslashesToSlashes,
} from "../utils/FilesUtil";
import { ErrorPrefix, SuccessPrefix, Colors } from "../constants";
import RouteParamsValidator from "./RouteParamsValidator";
import RouteDataParser from "./RouteDataParser";
import JsonWebToken from "./JsonWebToken";
import Response from "../interfaces/Response";
import Route from "../interfaces/Route";
import ParamRoute from "../interfaces/ParamRoute";
import { Service } from "../../service/Service";

dotenv.config();

export default class RouteServer {
    #app: Express;
    #tempFilesUploadDir: string | null = null;
    #registeredEndpoints: string[] = [];
    #endpointsPrefix!: string;

    constructor() {
        this.#app = express();

        this.#app.use(cors({ credentials: true, origin: process.env.CORS_ORIGIN }));
        this.#app.use(express.urlencoded({ limit: "200mb", extended: true }));
        this.#app.use(express.json({ limit: "200mb" }));
    }

    setEndpointPrefix(endpointsPrefix: string) {
        let prefix = endpointsPrefix;

        if (!prefix.startsWith("/")) prefix = `/${prefix}`;

        this.#endpointsPrefix = prefix === "/" ? prefix : prefix + "/";

        return this;
    }

    setTempFilesUploadDir(tempFilesUploadDir: string) {
        this.#tempFilesUploadDir = tempFilesUploadDir;
        return this;
    }

    getApp() {
        return this.#app;
    }

    #registerRoute(route: Route | ParamRoute, endpoint: string) {
        if (this.#registeredEndpoints.includes(endpoint)) {
            return false;
        }

        this.#registeredEndpoints.push(endpoint);

        if (!["post", "get", "options", "delete", "put", "patch"].includes(route._method)) {
            console.log(
                `${ErrorPrefix}Invalid method, expected post / get / options / delete / put / patch on ${endpoint}`
            );
            return false;
        }

        const preflights = [...route._prefights];

        if (route._jwtOptions.verify)
            preflights.unshift((req, res, next) => JsonWebToken._verify(req, res, next));

        const executorCallback = (() => {
            if (route._serviceObjectFetch) {
                const service = route._serviceObjectFetch;

                if (route._method === "get" && !(service._identifier in route._query)) {
                    console.log(
                        `${ErrorPrefix}Cannot process endpoint ${Colors.Red}${endpoint}${Colors.White} with service identifier not defined (GET, missing "${service._identifier}" in query)`
                    );
                    return () => {};
                }

                if (route._method !== "get" && !(service._identifier in route._body)) {
                    console.log(
                        `${ErrorPrefix}Cannot process endpoint ${Colors.Red}${endpoint}${Colors.White} with service identifier not defined (${route._method.toUpperCase()}, missing "${service._identifier}" in body)`
                    );
                    return () => {};
                }

                const isGet = route._method === "get";

                return (
                    req: Request,
                    res: ExpressResponse,
                    body: any,
                    query: any,
                    jwtTokenData: any,
                    files: any,
                    next: NextFunction
                ) => {
                    const identifier = (isGet ? query : body)[service._identifier];

                    if (!service._has(identifier)) {
                        return res.status(404).json({
                            error: `${service.constructor.name} - object not found`,
                        });
                    }

                    route._executor.call(
                        {
                            jwtTokenData,
                            serviceObject: service._get(identifier),
                        },
                        new Response(res),
                        body,
                        query,
                        files,
                        req,
                        next
                    );
                };
            }

            return (
                req: Request,
                res: ExpressResponse,
                body: any,
                query: any,
                jwtTokenData: any,
                files: any,
                next: NextFunction
            ) =>
                route._executor.call(
                    {
                        jwtTokenData,
                        serviceObject: null,
                    },
                    new Response(res),
                    body,
                    query,
                    files,
                    req,
                    next
                );
        })();

        const executor =
            route._jwtOptions.getData && route._jwtOptions.verify
                ? (req: Request, res: ExpressResponse, next: NextFunction, body: any, query: any, files: any) => {
                      const jwtTokenData = JsonWebToken._getTokenDataFromRequest(req);
                      executorCallback(req, res, body, query, jwtTokenData, files, next);
                  }
                : (req: Request, res: ExpressResponse, next: NextFunction, body: any, query: any, files: any) => {
                      executorCallback(req, res, body, query, {}, files, next);
                  };

        if (route._multipartOptions && !this.#tempFilesUploadDir) {
            console.log(
                `${ErrorPrefix}Cannot process files upload request, when temp files directory is not defined`
            );
            return false;
        }

        this.#app[route._method](endpoint, ...preflights, (req, res, next) => {
            const now = new Date();

            const date = [
                String(now.getDate()).padStart(2, "0"),
                String(now.getMonth() + 1).padStart(2, "0"),
                now.getFullYear(),
            ].join(".");

            const time = [
                String(now.getHours()).padStart(2, "0"),
                String(now.getMinutes()).padStart(2, "0"),
                String(now.getSeconds()).padStart(2, "0"),
            ].join(":");

            console.log(
                `${Colors.Black}[${Colors.Green}${Colors.Underscore}` +
                    `${date} ${time}` +
                    `${Colors.Black}]${Colors.None} ` +
                    `Called ` +
                    `${Colors.Green}${route._method.toUpperCase()}${Colors.None}` +
                    ` on ` +
                    `${Colors.Green}${endpoint}`
            );

            const processBaseRequest = (requestBody: any, files: any = {}) => {
                req.body = requestBody;

                const isValid = RouteParamsValidator.validate(req, res, {
                    body: route._body,
                    query: route._query,
                });

                if (!isValid) return;

                const { body, query } = RouteDataParser.parse(req, {
                    body: route._body,
                    query: route._query,
                });

                executor(req, res, next, body, query, files);
            };

            if (route._multipartOptions) {
                const form = new formidable.IncomingForm({
                    uploadDir: this.#tempFilesUploadDir!,
                    keepExtensions: true,
                    maxFieldsSize: Number(process.env.MAX_FILE_UPLOAD_SIZE_MB) * 1024 * 1024,
                    filename: (name, ext) => name + ext,
                });

                form.parse(req, (err, fields, files) => {
                    if (err) return res.status(400).json({ error: err.message });

                    for (const [name, options] of Object.entries(route._multipartOptions!)) {
                        if (!(name in files))
                            return res
                                .status(400)
                                .json({
                                    error: `Field '${name}' is missing in request structure (FormData)`,
                                });

                        const fileField = files[name] as any[];

                        if ("minLength" in options && fileField.length < options.minLength!)
                            return res
                                .status(400)
                                .json({
                                    error: `Field '${name}' have to be at minimum length of ${options.minLength} entries`,
                                });

                        if ("maxLength" in options && fileField.length > options.maxLength!)
                            return res
                                .status(400)
                                .json({
                                    error: `Field '${name}' have to be at maxmimum length of ${options.maxLength} entries`,
                                });

                        if ("length" in options && fileField.length !== options.length)
                            return res
                                .status(400)
                                .json({
                                    error: `Field '${name}' have to be at exact length of ${options.length} entries`,
                                });
                    }

                    const bodyField = route._bodyKey
                        ? (fields[route._bodyKey] as string[])
                        : null;

                    processBaseRequest(bodyField ? JSON.parse(bodyField[0]) : {}, files);
                });

                return;
            }

            processBaseRequest(req.body);
        });

        return true;
    }

    initRoutes(directory: string) {
        if (!this.#endpointsPrefix) {
            console.log(`${ErrorPrefix}Endpoints prefix is not defined`);
            return;
        }

        const extension = __filename.endsWith(".ts") ? ".ts" : ".js";
        const files = getFiles(directory, extension);

        for (const file of files) {
            const mod = require(path.resolve(file));
            const route: Route | ParamRoute = mod.default ?? mod;
            const fixedDirectory = removeDirUnnecessarySlashes(directory);
            const routeDirectory = (() => {
                const dir = removeDirUnnecessarySlashes(
                    backslashesToSlashes(
                        slashesToBackslashes(path.dirname(file)).replace(
                            slashesToBackslashes(fixedDirectory),
                            ""
                        )
                    )
                ).trim();

                if (dir === "") return "";

                return dir + "/";
            })();
            const fileNameWithoutExtension = removeExtension(file);
            const endpointPath =
                route instanceof ParamRoute
                    ? `${this.#endpointsPrefix}${routeDirectory}${route._route}`
                    : `${this.#endpointsPrefix}${routeDirectory}${fileNameWithoutExtension}`;

            if (this.#registerRoute(route, endpointPath)) {
                console.log(
                    `${SuccessPrefix}Registered route ${Colors.Green}${endpointPath}${Colors.None} (${route._method.toUpperCase()})`
                );
            }
        }
    }

    useServices(services: Record<string, Service>) {
        if (!this.#endpointsPrefix) {
            console.log(`${ErrorPrefix}Endpoints prefix is not defined`);
            return this;
        }

        for (const [endpointPrefix, service] of Object.entries(services)) {
            const identifierType = service._identifierType === "string" ? "anystring" : "number";
            const routes: Record<string, Route> = {
                get: new Route()
                    .setQuery({ [service._identifier]: { type: identifierType as any } })
                    .get(async (res, _, query) => {
                        const id = query[service._identifier];

                        if (!service._has(id))
                            return res.error(404, `${service.constructor.name} not found`);

                        res.send(service._get(id));
                    }),
                "get-all": new Route().setQuery({}).get(async (res) => {
                    res.send(service._values());
                }),
                delete: new Route()
                    .setBody({ [service._identifier]: { type: identifierType as any } })
                    .delete(async (res, body) => {
                        const id = body[service._identifier];

                        if (!service._has(id))
                            return res.error(404, `${service.constructor.name} not found`);

                        service._delete(id);

                        res.sendStatus(200);
                    }),
            };

            for (const [endpointSuffix, route] of Object.entries(routes)) {
                const fullEndpoint = `${this.#endpointsPrefix}${endpointPrefix}/${endpointSuffix}`;

                if (this.#registerRoute(route, fullEndpoint)) {
                    console.log(
                        `${SuccessPrefix}Registered default route ${Colors.Green}${fullEndpoint}${Colors.None} (${route._method.toUpperCase()})`
                    );
                }
            }
        }

        return this;
    }

    start(port: number | string, callback: () => void = () => {}) {
        this.#app.listen(port, callback);
        return this;
    }

    static(endpoint: string, directory: string) {
        this.#app.use(endpoint, express.static(directory));
    }

    get(endpoint: string, callback: (req: Request, res: ExpressResponse, next: NextFunction) => void) {
        this.#app.get(endpoint, callback);
    }
}
