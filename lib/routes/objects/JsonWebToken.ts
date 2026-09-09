import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

dotenv.config();

const { JWT_SECRET } = process.env;

class JsonWebTokenManager {
    create(data: object) {
        return jwt.sign(data, JWT_SECRET!);
    }

    _getTokenFromRequest(req: Request) {
        const token = req.headers.cookie
            ?.split(";")
            .find((c) => c.trim().startsWith("token="))
            ?.split("=")[1];

        return token ?? null;
    }

    async isValid(req: Request, res: Response) {
        return await new Promise<boolean>((resolve) => {
            const token = this._getTokenFromRequest(req);

            if (token == null) {
                res.status(401).json({ error: "Authorization token doesn't exist" });
                resolve(false);
                return;
            }

            jwt.verify(token, JWT_SECRET!, (err, response) => {
                if (err) {
                    resolve(false);
                    return;
                }

                res.locals = response as object;
                resolve(true);
            });
        });
    }

    _verify(req: Request, res: Response, next: NextFunction) {
        const token = this._getTokenFromRequest(req);

        if (token == null)
            return res.status(401).json({ error: "Authorization token doesn't exist" });

        jwt.verify(token, JWT_SECRET!, (err, response) => {
            if (err) return res.status(403).json({ error: "Invalid token signature" });

            res.locals = response as object;
            next();
        });
    }

    _getTokenDataFromRequest(req: Request) {
        const token = this._getTokenFromRequest(req);

        if (token === null) return null;

        return jwt.verify(token, JWT_SECRET!);
    }
}

const JsonWebToken = new JsonWebTokenManager();

export default JsonWebToken;
