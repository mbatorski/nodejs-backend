import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import Db from "../database/Database";

dotenv.config();

const Colors = {
    None: "\x1b[0m",
    Underscore: "\x1b[4m",
    Black: "\x1b[30m",
    Yellow: "\x1b[33m",
};
const ServicePrefix = `${Colors.Black}[${Colors.Yellow}${Colors.Underscore}Services${Colors.Black}]${Colors.None} `;

export class ServiceAttachment {
    shortPath: string;
    id: string;
    relativePath: string;
    fullPath: string;
    filename: string;

    constructor(shortPath: string, relativePath: string) {
        this.shortPath = shortPath;
        this.id = (() => {
            const filename = shortPath.split("/").pop()!;
            return path.parse(filename).name;
        })();
        this.relativePath = `${relativePath}/${shortPath}`;
        this.fullPath = `${process.env.APP_HOST}/${relativePath}/${shortPath}`;
        this.filename = path.basename(shortPath);
    }
}

type ServiceSettings<T extends object> = {
    table: string;
    identifier: string;
    identifierType: "string" | "number";
    attachmentsPath?: string;
    create: (row: any) => object;
    save: (object: T) => object;
    update: (object: object) => object;
};

export class Service<T extends object = any> {
    #ATTACHMENT_ID_LENGTH = 32;
    #cache = new Map<any, T>();
    #settings: ServiceSettings<T>;

    _table: string;
    _identifier: string;
    _identifierType: "string" | "number";

    constructor(settings: ServiceSettings<T>) {
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

    async load() {
        const rows = await Db.get(this._table);

        for (const row of rows) {
            const object = this.#createPrepare(row);
            this.#cache.set(row[this.#settings.identifier], object);
        }

        console.log(
            `${ServicePrefix}Loaded ${Colors.Yellow}${rows.length}${Colors.None} entries from table ${Colors.Yellow}${this._table}${Colors.None}`
        );
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

    _insert(identifier: any, object: T): T {
        Db.insert(this._table, this.#savePrepare(object) as Record<string, string | number>);

        this.#cache.set(identifier, { ...object } as T);

        return object;
    }

    _delete(identifier: any) {
        Db.delete(this._table, { where: { [this.#settings.identifier]: identifier } });
        this.#cache.delete(identifier);
    }

    _overwrite(identifier: string | number, newValues: Partial<T>): T {
        const object = this._get(identifier);

        Object.assign(object, newValues);

        return object;
    }

    _update(identifier: string | number, object: T): T {
        Db.update(
            this._table,
            this.#updatePrepare(object) as Record<string, string | number>,
            { where: { [this.#settings.identifier]: identifier } }
        );

        return { ...object } as T;
    }

    _set(id: any, object: T) {
        this.#cache.set(id, object);
    }

    _has(id: any) {
        return this.#cache.has(id);
    }

    _purge(id: any) {
        this.#cache.delete(id);
    }

    _get(id: any): T {
        return this.#cache.get(id)!;
    }

    _values(): T[] {
        return Array.from(this.#cache.values());
    }
}
