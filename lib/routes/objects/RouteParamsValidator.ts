import type { Request, Response } from "express";
import { isJson } from "../utils/ValidatorUtil";
import type { RouteSettings } from "../types";

const RouteParamsValidator = {
    _validateProperty(key: string, value: any, settings: RouteSettings) {
        if (`${value}`.length === 0 && !settings.optional && !settings.nullable) {
            return `Param "${key}" has an empty value`;
        }

        if (settings.type) {
            if (settings.type === "string" && !isNaN(value)) return `Param "${key}" has to be string`;
            if (settings.type === "number" && isNaN(value)) return `Param "${key}" has to be number`;
            if (settings.type === "json" && !isJson(value)) return `Param "${key}" has to be json`;
            if (settings.type === "array" && !Array.isArray(value)) return `Param "${key}" has to be array`;
            if (
                settings.type === "boolean" &&
                !["true", "false", "0", "1", true, false].includes(value)
            )
                return `Param "${key}" has to be boolean`;
            if (
                settings.type === "anystring" &&
                typeof value !== "string" &&
                typeof value !== "bigint" &&
                typeof value !== "boolean" &&
                typeof value !== "number" &&
                typeof value !== "symbol"
            )
                return `Param "${key}" has to be string-alike object (string, bigint, boolean, number, symbol)`;
        }

        if (settings.range) {
            if (Array.isArray(value)) {
                for (const element of value) {
                    if (!settings.range.includes(element))
                        return `Array "${key}" includes forbidden value ${element}, valid are: ${settings.range.map((e) => `'${e}'`).join(", ")}`;
                }
            } else if (!settings.range.includes(value)) {
                return `Param "${key}" must be one of this values: ${settings.range.map((e) => `'${e}'`).join(", ")}`;
            }
        }

        if (settings.length !== undefined && value.length !== settings.length) {
            return `Param "${key}" must have length of ${settings.length} characters`;
        }

        if (settings.maxLength !== undefined && value.length > settings.maxLength) {
            return `Param "${key}" must have maximum length of ${settings.maxLength} characters`;
        }

        if (settings.minLength !== undefined && value.length < settings.minLength) {
            return `Param "${key}" must have minimum length of ${settings.minLength} characters`;
        }

        if (settings.maxValue !== undefined && parseInt(value) > settings.maxValue) {
            return `Param "${key}" must have maximum value of ${settings.maxValue}`;
        }

        if (settings.minValue !== undefined && parseInt(value) < settings.minValue) {
            return `Param "${key}" must have minimum value of ${settings.minValue}`;
        }

        if (settings.onlyLatinCharacters) {
            const latinCharacters =
                "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

            for (const char of value) {
                if (!latinCharacters.includes(char))
                    return `Param "${key}" has to include only latin characters`;
            }
        }

        if (settings.onlyLatinCharactersAndNumbers) {
            const latinCharactersAndNumbers =
                "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

            for (const char of String(value)) {
                if (!latinCharactersAndNumbers.includes(char))
                    return `Param "${key}" has to include only latin characters or numbers`;
            }
        }

        return null;
    },

    _validateObject(object: Record<string, any>, settings: Record<string, RouteSettings>) {
        for (const [key, _settings] of Object.entries(settings)) {
            if (!(key in object) && _settings.optional) continue;

            if (!(key in object) && !_settings.optional) return `Param "${key}" is not present`;

            const result = this._validateProperty(key, object[key], _settings);

            if (!result) continue;

            return result;
        }

        return null;
    },

    validate(
        req: Request,
        res: Response,
        settings: {
            body?: Record<string, RouteSettings>;
            query?: Record<string, RouteSettings>;
        }
    ) {
        const bodyResult = this._validateObject(req.body, settings.body ?? {});

        if (bodyResult) {
            res.status(400).json({ error: bodyResult + " (body)" });
            return false;
        }

        const queryResult = this._validateObject(
            req.query as Record<string, any>,
            settings.query ?? {}
        );

        if (queryResult) {
            res.status(400).json({ error: queryResult + " (query)" });
            return false;
        }

        return true;
    },
};

export default RouteParamsValidator;
