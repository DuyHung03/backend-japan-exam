import mongoose from "mongoose";

/**
 * Exam - Bài thi JLPT
 *
 * Bài thi gồm 4 phần (sections) chuẩn JLPT.
 * Mỗi phần chứa nhiều QuestionBlock (embedded).
 * Câu hỏi được COPY từ Question Bank vào exam → hoàn toàn độc lập.
 *
 * Cấu trúc: Exam → Sections → Blocks → Questions (tất cả embedded)
 */

// Schema cho câu hỏi embedded trong bài thi (copy từ bank)
const examQuestionSchema = new mongoose.Schema({
    sourceQuestionId: {
        type: mongoose.Schema.Types.ObjectId, // ID gốc trong bank (để tracking)
    },
    questionText: {
        type: String,
        required: true,
    },
    options: [
        {
            label: { type: String, required: true },
            text: { type: String, required: true },
        },
    ],
    correctAnswer: {
        type: String,
        required: true,
    },
    explanation: String,
    translationVi: String,
    media: {
        image: String,
        audio: String,
    },
    points: {
        type: Number,
        default: 1,
    },
    order: {
        type: Number,
        default: 0,
    },
});

// Schema cho block câu hỏi embedded trong bài thi
const examBlockSchema = new mongoose.Schema({
    sourceBlockId: mongoose.Schema.Types.ObjectId, // ID gốc QuestionBlock trong bank
    title: String,
    questionType: String,
    instruction: String,
    order: {
        type: Number,
        default: 0,
    },
    // Context dùng chung (null = standalone)
    context: {
        text: String,
        audioUrl: String,
        audioScript: String,
        imageUrl: String,
    },
    questions: [examQuestionSchema],
});

// Schema cho phần thi
const examSectionSchema = new mongoose.Schema({
    sectionType: {
        type: String,
        enum: ["vocabulary", "grammar", "reading", "listening"],
        required: true,
    },
    sectionName: {
        type: String,
        required: true,
    },
    duration: {
        type: Number, // phút
        required: true,
    },
    order: {
        type: Number,
        required: true,
    },
    questionCount: {
        type: Number,
        default: 0,
    },
    points: {
        type: Number,
        default: 0,
    },
    passingScore: {
        type: Number,
        default: 0,
    },
    // Tất cả câu hỏi đều nằm trong blocks
    blocks: [examBlockSchema],
});

// Schema chính cho bài thi
const examSchema = new mongoose.Schema(
    {
        examCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },
        title: {
            type: String,
            required: [true, "Title is required"],
        },
        level: {
            type: String,
            enum: ["N5", "N4", "N3", "N2", "N1"],
            required: [true, "JLPT level is required"],
            index: true,
        },
        type: {
            type: String,
            enum: ["mock", "practice", "official_format"],
            default: "practice",
        },
        description: String,
        instructions: String,

        // ===== Cấu trúc bài thi =====
        sections: [examSectionSchema],

        // ===== Tổng hợp =====
        totalQuestions: {
            type: Number,
            required: true,
        },
        totalPoints: {
            type: Number,
            default: 180,
        },
        duration: {
            type: Number, // tổng thời gian (phút)
            required: true,
        },
        passingScore: {
            type: Number,
            default: 100,
        },

        // ===== Trạng thái =====
        status: {
            type: String,
            enum: ["draft", "published", "archived"],
            default: "draft",
            index: true,
        },
        isPublic: {
            type: Boolean,
            default: false,
            index: true,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        isDemoExam: {
            type: Boolean,
            default: false,
            index: true,
        },

        // ===== Tracking =====
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        publishedAt: Date,
        viewCount: {
            type: Number,
            default: 0,
        },
        attemptCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    },
);

examSchema.index({ level: 1, status: 1, isPublic: 1 });
examSchema.index({ createdBy: 1 });

export default mongoose.model("Exam", examSchema);
