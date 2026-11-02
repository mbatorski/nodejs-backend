import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AsyncService } from "../../lib/service/AsyncService";

type User = {
    id: number;
    username: string;
    password: string;
    firstname: string;
    lastname: string;
    createdAt: number;
    updatedAt: number;
};

class UsersService extends AsyncService<User> {
    #PASSWORD_HASH_SALT_ROUNDS = 12;

    constructor() {
        super({
            table: "users",
            identifier: "id",
            identifierType: "number",
            create: (row) => ({ ...row }),
            save: (obj) => ({ ...obj }),
            update: (obj) =>
                this._reduce(obj, ["id", "createdAt"]),
        });
    }

    async getHashedPassword(password: string) {
        return await bcrypt.hash(password, this.#PASSWORD_HASH_SALT_ROUNDS);
    }

    async arePasswordsEqual(password: string, hashedPassword: string) {
        return await bcrypt.compare(password, hashedPassword);
    }

    signJWTToken(user: User) {
        return jwt.sign({ id: user.id }, process.env.JWT_SECRET!);
    }

    async get(id: number) {
        return await this._get(id);
    }

    async getByUsername(username: string) {
        return await this._find({ username });
    }

    async getAll() {
        return await this._values();
    }

    async create(data: {
        firstname: string;
        lastname: string;
        username: string;
        password: string;
    }) {
        const id = await this._getNextId();

        data.password = await this.getHashedPassword(data.password);

        return await this._insert(id, {
            ...data,
            id,
            createdAt: new Date().getTime(),
            updatedAt: new Date().getTime(),
        });
    }

    async edit(
        id: number,
        data: {
            firstname?: string;
            lastname?: string;
            username?: string;
            password?: string;
        }
    ) {
        if (data.password) data.password = await this.getHashedPassword(data.password);

        return await this._update(
            id,
            await this._overwrite(id, {
                ...data,
                updatedAt: new Date().getTime(),
            })
        );
    }

    async delete(id: number) {
        await this._delete(id);
    }
}

const Users = new UsersService();

export default Users;
