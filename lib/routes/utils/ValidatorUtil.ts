export function isJson(string: string) {
    try {
        JSON.parse(string);
    } catch {
        return false;
    }

    return true;
}
