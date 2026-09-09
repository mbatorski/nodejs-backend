import { reduce } from "../utils/ReduceUtil";
import type { Response as ExpressResponse } from "express";

export default class Response {
    _res: ExpressResponse;

    constructor(res: ExpressResponse) {
        this._res = res;
    }

    send(data: string | object, reduceKeys: string[] = []) {
        if (Array.isArray(data)) {
            this._res.json(data);
            return;
        }

        if (typeof data === "object") {
            this._res.send(reduce(data, reduceKeys));
            return;
        }

        this._res.send(data);
    }

    sendArray(array: object[], reduceKeys: string[] = []) {
        this._res.send(array.map((e) => reduce(e, reduceKeys)));
    }

    sendStatus(code: number) {
        this._res.sendStatus(code);
    }

    code(code: number, message: string | object) {
        this._res.status(code).send(message);
    }

    error(code: number, message: string) {
        this._res.status(code).send({ error: message });
    }
}
