import { AsyncService } from "../../lib/service/AsyncService";

type Example = {
    id: number;
    name: string;
};

class ExampleAsyncService extends AsyncService<Example> {
    constructor() {
        super({
            table: "examples",
            identifier: "id",
            identifierType: "number",
            create: (row) => ({ ...row }),
            save: (obj) => ({ ...obj }),
            update: (obj) => this._reduce(obj, ["id"]),
        });
    }

    async get(id: number) {
        return await this._get(id);
    }

    async create(data: { name: string }) {
        const id = await this._getNextId();

        return await this._insert(id, {
            id,
            name: data.name,
        });
    }
}

const Examples = new ExampleAsyncService();

export default Examples;
