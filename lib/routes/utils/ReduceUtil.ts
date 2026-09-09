export function reduce(object: object, properties: string[]) {
    const copy = Object.assign({}, object);

    for (const property of properties) {
        delete (copy as any)[property];
    }

    return copy;
}
