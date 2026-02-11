export default class Logger {
    static info(message, meta = {}) {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta);
    }

    static error(message, error = null, meta = {}) {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, {
            ...meta,
            error: error?.stack || error,
        });
    }

    static warn(message, meta = {}) {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta);
    }

    static debug(message, meta = {}) {
        if (process.env.NODE_ENV === "development") {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta);
        }
    }

    static success(message, meta = {}) {
        console.log(`[SUCCESS] ${new Date().toISOString()} - ✅ ${message}`, meta);
    }
}
