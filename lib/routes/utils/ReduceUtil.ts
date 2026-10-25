/**
 * Removes properties from an object. Supports dotted paths for nested
 * properties (e.g. `"results.verifiedAt"`). When a path segment resolves
 * to an array, the remaining path is applied to each element.
 */
export function reduce(object: object, properties: string[]) {
    let result: any = cloneShallow(object);

    for (const property of properties) {
        result = omitPath(result, String(property).split("."));
    }

    return result;
}

function cloneShallow(value: any): any {
    if (Array.isArray(value)) return value.slice();
    if (value !== null && typeof value === "object") return Object.assign({}, value);
    return value;
}

function omitPath(value: any, parts: string[]): any {
    if (value == null || typeof value !== "object") return value;

    if (Array.isArray(value)) {
        return value.map((item) => omitPath(item, parts));
    }

    const [head, ...rest] = parts;
    const copy = Object.assign({}, value);

    if (rest.length === 0) {
        delete copy[head];
        return copy;
    }

    if (head in copy) {
        copy[head] = omitPath(copy[head], rest);
    }

    return copy;
}
