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

// 4 phần chuẩn JLPT
export const SECTION_TYPES = {
    VOCABULARY: "vocabulary", // 文字・語彙 - Từ vựng
    GRAMMAR: "grammar", // 文法 - Ngữ pháp
    READING: "reading", // 読解 - Đọc hiểu
    LISTENING: "listening", // 聴解 - Nghe
};

export const DIFFICULTY_LEVELS = {
    EASY: "easy",
    MEDIUM: "medium",
    HARD: "hard",
};

export const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"];

// Phân loại chi tiết câu hỏi JLPT theo section (nguồn: jlpt.jp)
export const QUESTION_TYPES = {
    // Vocabulary (文字・語彙)
    KANJI_READING: "kanji_reading", // 漢字読み
    ORTHOGRAPHY: "orthography", // 表記
    WORD_FORMATION: "word_formation", // 語形成
    CONTEXTUAL_EXPRESSIONS: "contextual_expressions", // 文脈規定
    PARAPHRASES: "paraphrases", // 言い換え類義
    USAGE: "usage", // 用法

    // Grammar (文法)
    GRAMMAR_FORM: "grammar_form", // 文の文法1 (文法形式の判断)
    SENTENCE_COMPOSITION: "sentence_composition", // 文の文法2 (文の組み立て)
    TEXT_GRAMMAR: "text_grammar", // 文章の文法

    // Reading (読解)
    SHORT_PASSAGES: "short_passages", // 短文
    MID_PASSAGES: "mid_passages", // 中文
    LONG_PASSAGES: "long_passages", // 長文
    INTEGRATED_READING: "integrated_reading", // 統合理解
    THEMATIC_COMPREHENSION: "thematic_comprehension", // 主張理解
    INFORMATION_RETRIEVAL: "information_retrieval", // 情報検索

    // Listening (聴解)
    TASK_BASED: "task_based", // 課題理解
    KEY_POINTS: "key_points", // ポイント理解
    GENERAL_OUTLINE: "general_outline", // 概要理解
    VERBAL_EXPRESSIONS: "verbal_expressions", // 発話表現
    QUICK_RESPONSE: "quick_response", // 即時応答
    INTEGRATED_LISTENING: "integrated_listening", // 統合理解
};

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

/**
 * Cấu hình tính điểm chuẩn JLPT (nguồn: jlpt.jp)
 *
 * JLPT thật sử dụng IRT (Item Response Theory) để tính điểm scaled.
 * Hệ thống này dùng proportional raw-to-scaled scoring:
 *   scaledScore = (correct / total) × maxScore
 *
 * scoringGroups: các nhóm tính điểm chính thức
 *   - N1/N2/N3: 3 nhóm (言語知識, 読解, 聴解) — mỗi nhóm 0-60
 *   - N4/N5: 2 nhóm (言語知識+読解 gộp 0-120, 聴解 0-60)
 *
 * sections: mapping từ sectionType → scoringGroup
 * passingTotal: tổng điểm tối thiểu để đạt
 * Mỗi scoringGroup có sectionsMinScore: điểm tối thiểu nhóm đó phải đạt
 */
export const JLPT_SCORING_CONFIG = {
    N1: {
        totalPoints: 180,
        passingTotal: 100,
        duration: 170, // phút (nghe 60 + đọc+ngữ pháp 110)
        scoringGroups: [
            {
                id: "language_knowledge",
                name: "言語知識 (文字・語彙・文法)",
                nameVi: "Kiến thức ngôn ngữ",
                maxScore: 60,
                sectionsMinScore: 19,
                sections: ["vocabulary", "grammar"],
            },
            {
                id: "reading",
                name: "読解",
                nameVi: "Đọc hiểu",
                maxScore: 60,
                sectionsMinScore: 19,
                sections: ["reading"],
            },
            {
                id: "listening",
                name: "聴解",
                nameVi: "Nghe hiểu",
                maxScore: 60,
                sectionsMinScore: 19,
                sections: ["listening"],
            },
        ],
    },
    N2: {
        totalPoints: 180,
        passingTotal: 90,
        duration: 155,
        scoringGroups: [
            {
                id: "language_knowledge",
                name: "言語知識 (文字・語彙・文法)",
                nameVi: "Kiến thức ngôn ngữ",
                maxScore: 60,
                sectionsMinScore: 19,
                sections: ["vocabulary", "grammar"],
            },
            {
                id: "reading",
                name: "読解",
                nameVi: "Đọc hiểu",
                maxScore: 60,
                sectionsMinScore: 19,
                sections: ["reading"],
            },
            {
                id: "listening",
                name: "聴解",
                nameVi: "Nghe hiểu",
                maxScore: 60,
                sectionsMinScore: 19,
                sections: ["listening"],
            },
        ],
    },
    N3: {
        totalPoints: 180,
        passingTotal: 95,
        duration: 140,
        scoringGroups: [
            {
                id: "language_knowledge",
                name: "言語知識 (文字・語彙・文法)",
                nameVi: "Kiến thức ngôn ngữ",
                maxScore: 60,
                sectionsMinScore: 19,
                sections: ["vocabulary", "grammar"],
            },
            {
                id: "reading",
                name: "読解",
                nameVi: "Đọc hiểu",
                maxScore: 60,
                sectionsMinScore: 19,
                sections: ["reading"],
            },
            {
                id: "listening",
                name: "聴解",
                nameVi: "Nghe hiểu",
                maxScore: 60,
                sectionsMinScore: 19,
                sections: ["listening"],
            },
        ],
    },
    N4: {
        totalPoints: 180,
        passingTotal: 90,
        duration: 125,
        scoringGroups: [
            {
                id: "language_knowledge_reading",
                name: "言語知識 (文字・語彙・文法)・読解",
                nameVi: "Kiến thức ngôn ngữ + Đọc hiểu",
                maxScore: 120,
                sectionsMinScore: 38,
                sections: ["vocabulary", "grammar", "reading"],
            },
            {
                id: "listening",
                name: "聴解",
                nameVi: "Nghe hiểu",
                maxScore: 60,
                sectionsMinScore: 19,
                sections: ["listening"],
            },
        ],
    },
    N5: {
        totalPoints: 180,
        passingTotal: 80,
        duration: 105,
        scoringGroups: [
            {
                id: "language_knowledge_reading",
                name: "言語知識 (文字・語彙・文法)・読解",
                nameVi: "Kiến thức ngôn ngữ + Đọc hiểu",
                maxScore: 120,
                sectionsMinScore: 38,
                sections: ["vocabulary", "grammar", "reading"],
            },
            {
                id: "listening",
                name: "聴解",
                nameVi: "Nghe hiểu",
                maxScore: 60,
                sectionsMinScore: 19,
                sections: ["listening"],
            },
        ],
    },
};

export const FILE_LIMITS = {
    MAX_IMAGE_SIZE: 10 * 1024 * 1024,
    MAX_AUDIO_SIZE: 50 * 1024 * 1024,
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    ALLOWED_AUDIO_TYPES: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"],
};
