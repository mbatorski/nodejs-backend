import fs from "fs";
import path from "path";

export function getFiles(dir: string, filter = "") {
    const files: string[] = [];

    fs.readdirSync(dir).forEach((file) => {
        const absolutePath = path.join(dir, file);
        const isDirectory = fs.statSync(absolutePath).isDirectory();

        if (!isDirectory && !file.endsWith(filter)) return;

        if (isDirectory) {
            files.push(...getFiles(absolutePath, filter));
        } else {
            files.push(absolutePath);
        }
    });

    return files;
}

export function removeExtension(filePath: string) {
    return path.parse(path.basename(filePath)).name;
}

export function removeDirUnnecessarySlashes(directory: string) {
    directory = backslashesToSlashes(directory);

    if (directory.startsWith("/")) directory = directory.slice(1);
    if (directory.startsWith("./")) directory = directory.slice(2);
    if (directory.endsWith("/")) directory = directory.slice(0, -1);

    return directory;
}

export function slashesToBackslashes(directory: string) {
    return directory.replaceAll("/", "\\");
}

export function backslashesToSlashes(directory: string) {
    return directory.replaceAll("\\", "/");
}
