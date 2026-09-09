import type { Request } from "express";
import type { RouteSettings } from "../types";

const RouteDataParser = {
    _parseObject(object: Record<string, any>, settings: Record<string, RouteSettings>) {
        const copy = Object.assign({}, object);
        const validKeys = Object.keys(settings);

        for (const key of Object.keys(object)) {
            if (!validKeys.includes(key)) delete copy[key];
        }

        for (const [key, _settings] of Object.entries(settings)) {
            if (!(key in copy)) continue;

            if (_settings.nullable && (copy[key] === null || copy[key] === "")) continue;

            switch (_settings.type) {
                case "json":
                    copy[key] = JSON.parse(copy[key]);
                    break;
                case "number":
                    copy[key] = Number(copy[key]);
                    break;
                case "boolean":
                    copy[key] = copy[key] === "true" || copy[key] === "1" || copy[key] === true;
                    break;
            }
        }

        return copy;
    },

    parse(
        req: Request,
        settings: {
            body?: Record<string, RouteSettings>;
            query?: Record<string, RouteSettings>;
        }
    ) {
        const merged = { body: {} as Record<string, any>, query: {} as Record<string, any> };

        if (settings.body) {
            merged.body = this._parseObject(req.body, settings.body);
        }

        if (settings.query) {
            merged.query = this._parseObject(req.query as Record<string, any>, settings.query);
        }

        return merged;
    },
};

export default RouteDataParser;
