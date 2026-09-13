import fs from "fs";
import path from "path";

const LOGS_DIR = "assets/private/logs";

type LogEntry = {
    url: string;
    method: string;
    payload: any;
    datetime: string;
    responseCode: number;
    response: any;
    error?: any;
};

export function log(entry: LogEntry) {
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

    const now = new Date();
    const filename = [
        String(now.getDate()).padStart(2, "0"),
        String(now.getMonth() + 1).padStart(2, "0"),
        now.getFullYear(),
    ].join(".") + ".log";

    const filePath = path.join(LOGS_DIR, filename);

    fs.appendFileSync(filePath, JSON.stringify(entry) + "\n");
}
