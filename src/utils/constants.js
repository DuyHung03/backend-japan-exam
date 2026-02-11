export const SUCCESS = "success";
export const ERROR = "error";

export const ROLES = {
    USER: "user",
    TEACHER: "teacher",
    ADMIN: "admin",
};

export const USER_STATUS = {
    ACTIVE: "active",
    LOCKED: "locked",
};

export const QUESTION_STATUS = {
    DRAFT: "draft",
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
};

export const EXAM_STATUS = {
    DRAFT: "draft",
    PUBLISHED: "published",
    ARCHIVED: "archived",
};

export const ATTEMPT_STATUS = {
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
    SUBMITTED: "submitted",
};

export const SECTION_TYPES = {
    LANGUAGE_KNOWLEDGE: "language_knowledge",
    READING: "reading",
    LISTENING: "listening",
};

export const QUESTION_TYPES = {
    KANJI_READING: "kanji_reading",
    KANJI_WRITING: "kanji_writing",
    VOCAB_MEANING: "vocab_meaning",
    VOCAB_USAGE: "vocab_usage",
    GRAMMAR_CHOOSE: "grammar_choose",
    GRAMMAR_ARRANGE: "grammar_arrange",
    READING_COMPREHENSION: "reading_comprehension",
    LISTENING_TASK: "listening_task",
    LISTENING_POINT: "listening_point",
    LISTENING_GENERAL: "listening_general",
    LISTENING_QUICK: "listening_quick",
};

export const DIFFICULTY_LEVELS = {
    EASY: "easy",
    MEDIUM: "medium",
    HARD: "hard",
};

export const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"];

export const SKILL_LEVELS = {
    WEAK: "weak",
    AVERAGE: "average",
    GOOD: "good",
    EXCELLENT: "excellent",
};

export const RANKS = ["A", "B", "C", "D", "F"];

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
};

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
};

export const FILE_LIMITS = {
    MAX_IMAGE_SIZE: 10 * 1024 * 1024,
    MAX_AUDIO_SIZE: 50 * 1024 * 1024,
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    ALLOWED_AUDIO_TYPES: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"],
};
