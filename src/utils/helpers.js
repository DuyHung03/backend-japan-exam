export const generateRandomString = (length = 10) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const generateExamCode = (level, title) => {
    const timestamp = Date.now();
    const random = generateRandomString(4);
    const cleanTitle = title
        .replace(/[^a-zA-Z0-9]/g, "_")
        .slice(0, 20)
        .toUpperCase();
    return `${level}_${cleanTitle}_${timestamp}_${random}`;
};

export const calculatePercentage = (value, total) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
};

export const calculateGrade = (percentage) => {
    if (percentage >= 90) return "A";
    if (percentage >= 80) return "B";
    if (percentage >= 70) return "C";
    if (percentage >= 60) return "D";
    return "F";
};

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

export const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export const pickRandom = (array, count) => {
    const shuffled = shuffleArray(array);
    return shuffled.slice(0, count);
};

export const groupBy = (array, key) => {
    return array.reduce((result, item) => {
        const group = typeof key === "function" ? key(item) : item[key];
        if (!result[group]) {
            result[group] = [];
        }
        result[group].push(item);
        return result;
    }, {});
};

export const omit = (obj, keys) => {
    const result = { ...obj };
    keys.forEach((key) => delete result[key]);
    return result;
};

export const pick = (obj, keys) => {
    return keys.reduce((result, key) => {
        if (obj[key] !== undefined) {
            result[key] = obj[key];
        }
        return result;
    }, {});
};

export const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};

export const sanitizeFilename = (filename) => {
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
};

export const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

export const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
};

export const parseQueryInt = (value, defaultValue = 1) => {
    const parsed = parseInt(value);
    return isNaN(parsed) || parsed < 1 ? defaultValue : parsed;
};

export const parseQueryBoolean = (value) => {
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
    return undefined;
};
