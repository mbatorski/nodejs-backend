import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import Db from "../database/Database";
import { ServiceAttachment } from "./Service";

dotenv.config();

type AsyncServiceSettings<T extends object> = {
    table: string;
    identifier: string;
    identifierType: "string" | "number";
    attachmentsPath?: string;
    create: (row: any) => object;
    save: (object: T) => object;
    update: (object: object) => object;
};

export class AsyncService<T extends object = any> {
    #ATTACHMENT_ID_LENGTH = 32;
    #settings: AsyncServiceSettings<T>;

    _table: string;
    _identifier: string;
    _identifierType: "string" | "number";

    constructor(settings: AsyncServiceSettings<T>) {
        this.#settings = settings;
        this._table = settings.table;
        this._identifier = settings.identifier;
        this._identifierType = settings.identifierType;
    }

    #getRandomCharacters(length: number) {
        let result = "";
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".toLowerCase();
        let counter = 0;

        while (counter < length) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
            counter += 1;
        }

        return result;
    }

    #snakeToCamelStyle(obj: object) {
        const snakeToCamel = (str: string) =>
            str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [snakeToCamel(key), value])
        );
    }

    #camelToSnakeStyle(obj: object) {
        const camelToSnake = (str: string) =>
            str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [camelToSnake(key), value])
        );
    }

    #createPrepare(row: object): T {
        const { create } = this.#settings;

        return this.#snakeToCamelStyle(create(row)) as T;
    }

    #savePrepare(object: T) {
        return this.#camelToSnakeStyle(this.#settings.save(object));
    }

    #updatePrepare(object: T) {
        const { update, save } = this.#settings;
        return this.#camelToSnakeStyle(update(save(object)));
    }

    parseAttachment(shortPath: string) {
        return new ServiceAttachment(shortPath, this.#settings.attachmentsPath!);
    }

    async createAttachmentMove(filePath: string, prefixPath = ""): Promise<ServiceAttachment | null> {
        const id = this.#getRandomCharacters(this.#ATTACHMENT_ID_LENGTH);
        const extension = path.extname(filePath);
        const shortDir = prefixPath !== "" ? `${prefixPath}/` : "";
        const relativeDir = this.#settings.attachmentsPath + "/" + shortDir;

        if (!fs.existsSync(relativeDir)) fs.mkdirSync(relativeDir, { recursive: true });

        const shortPath = `${shortDir}${id}${extension}`;
        const attachment = new ServiceAttachment(shortPath, this.#settings.attachmentsPath!);
        const { relativePath } = attachment;

        return new Promise((resolve) => {
            fs.rename(filePath, relativePath, (err) => {
                if (err) console.log(err);
                resolve(err ? null : attachment);
            });
        });
    }

    createAttachmentCopy(filePath: string, prefixPath = ""): Promise<ServiceAttachment | null> {
        const tempId = this.#getRandomCharacters(this.#ATTACHMENT_ID_LENGTH);
        const tempFilePath = `${path.dirname(filePath)}/${tempId}${path.extname(filePath)}`;

        return new Promise((resolve) => {
            fs.copyFile(filePath, tempFilePath, (err) => {
                if (err) console.log(err);
                resolve(err ? null : this.createAttachmentMove(tempFilePath, prefixPath));
            });
        });
    }

    _reduce(object: object, keys: string[]) {
        if (keys.length === 0) return object;

        return Object.fromEntries(
            Object.entries(object).filter(([k]) => !keys.includes(k))
        );
    }

    async _getNextId() {
        return await Db.getNextAI(this._table);
    }

    async _insert(identifier: any, object: T): Promise<T> {
        await Db.insert(this._table, this.#savePrepare(object) as Record<string, string | number>);

        return object;
    }

    async _delete(identifier: any) {
        await Db.delete(this._table, { where: { [this.#settings.identifier]: identifier } });
    }

    async _overwrite(identifier: string | number, newValues: Partial<T>): Promise<T> {
        const object = await this._get(identifier);

        return { ...object, ...newValues } as T;
    }

    async _update(identifier: string | number, object: T): Promise<T> {
        await Db.update(
            this._table,
            this.#updatePrepare(object) as Record<string, string | number>,
            { where: { [this.#settings.identifier]: identifier } }
        );

        return object;
    }

    async _has(id: any): Promise<boolean> {
        const rows = await Db.get(this._table, {
            where: { [this.#settings.identifier]: id },
        });

        return rows.length > 0;
    }

    async _get(id: any): Promise<T> {
        const rows = await Db.get(this._table, {
            where: { [this.#settings.identifier]: id },
        });

        return this.#createPrepare(rows[0]);
    }

    async _find(where: Record<string, string | number>): Promise<T | undefined> {
        const rows = await Db.get(this._table, {
            where: this.#camelToSnakeStyle(where) as Record<string, string | number>,
        });

        if (rows.length === 0) return undefined;

        return this.#createPrepare(rows[0]);
    }

    async _values(): Promise<T[]> {
        const rows = await Db.get(this._table);

        return rows.map((row: object) => this.#createPrepare(row));
    }
}
