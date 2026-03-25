import { JLPT_SCORING_CONFIG } from "./constants.js";

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

/**
 * Tính điểm theo chuẩn JLPT scoring groups.
 *
 * Nhận vào danh sách sectionScores (đã tính raw score per section)
 * và level (N1-N5), trả về:
 *   - scoringGroupScores: điểm từng nhóm tính điểm JLPT
 *   - totalScore (scaled 0-180)
 *   - passed (đạt cả tổng & mỗi nhóm)
 *   - passingTotal (điểm đạt cấp độ)
 *
 * @param {Array} sectionScores - [{sectionType, correctAnswers, totalQuestions, ...}]
 * @param {string} level - "N1" | "N2" | "N3" | "N4" | "N5"
 * @returns {Object} JLPT scoring result
 */
export const calculateJlptScoring = (sectionScores, level) => {
    const config = JLPT_SCORING_CONFIG[level];
    if (!config) return null;

    const scoringGroupScores = config.scoringGroups.map((group) => {
        // Tìm các section thuộc nhóm này
        const matchedSections = sectionScores.filter((s) => group.sections.includes(s.sectionType));

        // Gộp raw correct / raw total từ tất cả sections trong nhóm
        const groupCorrect = matchedSections.reduce((sum, s) => sum + (s.correctAnswers || 0), 0);
        const groupTotal = matchedSections.reduce((sum, s) => sum + (s.totalQuestions || 0), 0);

        // Proportional raw-to-scaled: (correct / total) × maxScore
        const score = groupTotal > 0 ? Math.round((groupCorrect / groupTotal) * group.maxScore) : 0;

        return {
            groupId: group.id,
            groupName: group.name,
            groupNameVi: group.nameVi,
            correctAnswers: groupCorrect,
            totalQuestions: groupTotal,
            score,
            maxScore: group.maxScore,
            minScore: group.sectionsMinScore,
            passed: score >= group.sectionsMinScore,
        };
    });

    const totalScore = scoringGroupScores.reduce((sum, g) => sum + g.score, 0);
    const allGroupsPassed = scoringGroupScores.every((g) => g.passed);
    const passed = totalScore >= config.passingTotal && allGroupsPassed;

    return {
        scoringGroupScores,
        totalScore,
        maxScore: config.totalPoints,
        passingTotal: config.passingTotal,
        percentage:
            config.totalPoints > 0 ? Math.round((totalScore / config.totalPoints) * 100) : 0,
        passed,
        allGroupsPassed,
    };
};

/**
 * Lấy giá trị mặc định cho exam dựa trên JLPT level
 */
export const getJlptDefaults = (level) => {
    const config = JLPT_SCORING_CONFIG[level];
    if (!config) return { totalPoints: 180, passingScore: 100, duration: 120 };
    return {
        totalPoints: config.totalPoints,
        passingScore: config.passingTotal,
        duration: config.duration,
    };
};
