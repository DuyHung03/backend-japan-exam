import mongoose from "mongoose";

/**
 * Bookmark - Lưu câu hỏi khó / đánh dấu câu hỏi
 */
const bookmarkSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        examId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exam",
            required: true,
        },
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        sectionType: {
            type: String,
            enum: ["vocabulary", "grammar", "reading", "listening"],
        },
        note: {
            type: String,
            maxlength: 500,
            default: "",
        },
    },
    { timestamps: true },
);

bookmarkSchema.index({ user: 1, examId: 1, questionId: 1 }, { unique: true });
bookmarkSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Bookmark", bookmarkSchema);