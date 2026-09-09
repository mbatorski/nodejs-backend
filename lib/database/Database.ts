import mysql from "mysql";
import dotenv from "dotenv";

dotenv.config();

type RestObject = {
    where?: Record<string, string | number>;
    order?: Record<string, "ASC" | "DESC">;
};

class Database {
    connection: mysql.Connection;

    constructor(options: mysql.ConnectionConfig) {
        this.connection = mysql.createConnection(options);
    }

    #getRestStatement(object: RestObject) {
        const statement = { text: "", values: [] as (string | number)[] };

        if (typeof object !== "object") return statement;

        if ("where" in object && object.where) {
            const { where } = object;

            statement.text += `WHERE ${Object.keys(where)
                .map((el) => `\`${el}\` = ?`)
                .join(" AND ")}`;

            statement.values.push(...Object.values(where));
        }

        if ("order" in object && object.order) {
            const { order } = object;

            statement.text += `ORDER BY ${Object.keys(order)
                .map((key) => `${key} ${order[key]}`)
                .join(", ")}`;
        }

        return statement;
    }

    #doQuery(statement: string, values: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            this.connection.query(statement, values, (error, results) => {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    }

    onConnect(callback: (err?: mysql.MysqlError) => void) {
        this.connection.connect((err) => {
            console.log(`Connected to database!`);
            callback(err);
        });
    }

    setKeepAliveTable(table: string) {
        setInterval(() => {
            this.get(table);
        }, 1000 * 60 * 60 * 1);
    }

    async get(table: string, rest: RestObject = {}) {
        const restStatement = this.#getRestStatement(rest);
        const statement = `SELECT * FROM \`${table}\` ${restStatement.text}`;

        return await this.#doQuery(statement, restStatement.values);
    }

    async update(table: string, values: Record<string, string | number>, rest: RestObject = {}) {
        const restStatement = this.#getRestStatement(rest);
        const columns = Object.keys(values)
            .map((el) => `\`${el}\` = ?`)
            .join(", ");

        const statement = `UPDATE \`${table}\` SET ${columns} ${restStatement.text}`;

        return await this.#doQuery(statement, [...Object.values(values), ...restStatement.values]);
    }

    async insert(table: string, values: Record<string, string | number>, rest: RestObject = {}) {
        const restStatement = this.#getRestStatement(rest);
        const columns = `(${Object.keys(values).map((e) => `\`${e}\``).join(", ")})`;
        const mappedValues = `VALUES(${Object.values(values)
            .map(() => "?")
            .join(", ")})`;

        const statement = `INSERT INTO \`${table}\` ${columns} ${mappedValues} ${restStatement.text}`;

        return await this.#doQuery(statement, [...Object.values(values), ...restStatement.values]);
    }

    async delete(table: string, rest: RestObject = {}) {
        const restStatement = this.#getRestStatement(rest);
        const statement = `DELETE FROM \`${table}\` ${restStatement.text}`;

        return await this.#doQuery(statement, [...restStatement.values]);
    }

    async getNextAI(table: string): Promise<number> {
        const query = await this.#doQuery(`SHOW TABLE STATUS LIKE '${table}'`);

        return query[0].Auto_increment;
    }
}

const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;

const Db = new Database({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    charset: "utf8mb4",
});

export default Db;
