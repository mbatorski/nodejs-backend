import type { Request, Response as ExpressResponse, NextFunction } from "express";
import type { Files } from "formidable";
import { Service } from "../../service/Service";
import type { JsonWebTokenOptions, MultipartFieldOptions, RequestMethod, RouteSettings } from "../types";
import Response from "./Response";

export type RouteContext = {
    jwtTokenData: any;
    serviceObject: any;
};

export type RouteFunction = (
    this: RouteContext,
    res: Response,
    body: any,
    query: any,
    files: Files,
    req: Request,
    next: NextFunction
) => void;

export default class Route {
    _prefights: ((req: Request, res: ExpressResponse, next: NextFunction) => any)[] = [];
    _body: Record<string, RouteSettings> = {};
    _query: Record<string, RouteSettings> = {};
    _method!: RequestMethod;
    _jwtOptions: JsonWebTokenOptions = { verify: false, getData: false };
    _multipartOptions: Record<string, MultipartFieldOptions> | null = null;
    _bodyKey: string | null = null;
    _serviceObjectFetch: Service | null = null;
    _executor!: RouteFunction;

    setJWT(jwtOptions: JsonWebTokenOptions) {
        this._jwtOptions = jwtOptions;
        return this;
    }

    setMultipart(multipartOptions: Record<string, MultipartFieldOptions>) {
        this._multipartOptions = multipartOptions;
        return this;
    }

    setBodyKey(bodyKey: string) {
        this._bodyKey = bodyKey;
        return this;
    }

    jwt() {
        this._jwtOptions = { verify: true, getData: true };
        return this;
    }

    setBody(body: Record<string, RouteSettings>) {
        this._body = body;
        return this;
    }

    setQuery(query: Record<string, RouteSettings>) {
        this._query = query;
        return this;
    }

    setServiceObjectFetch(service: Service) {
        this._serviceObjectFetch = service;
        return this;
    }

    prefight(callback: (req: Request, res: ExpressResponse, next: NextFunction) => any) {
        this._prefights.push(callback);
        return this;
    }

    post(callback: RouteFunction) {
        this._method = "post";
        this._executor = callback;
        return this;
    }

    get(callback: RouteFunction) {
        this._method = "get";
        this._executor = callback;
        return this;
    }

    options(callback: RouteFunction) {
        this._method = "options";
        this._executor = callback;
        return this;
    }

    delete(callback: RouteFunction) {
        this._method = "delete";
        this._executor = callback;
        return this;
    }

    put(callback: RouteFunction) {
        this._method = "put";
        this._executor = callback;
        return this;
    }

    patch(callback: RouteFunction) {
        this._method = "patch";
        this._executor = callback;
        return this;
    }
}
