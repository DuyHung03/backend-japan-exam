import mongoose from "mongoose";

/**
 * QuestionBlock - Đơn vị hiển thị trên màn hình
 *
 * Mỗi block = 1 đơn vị render:
 *   - Standalone: 1 câu hỏi đơn → context = null
 *   - Group: nội dung chung (đoạn văn / audio / hình) + N câu hỏi → context có giá trị
 *
 * Câu hỏi con nằm ở collection Question, reference qua block._id.
 * API luôn trả về shape QuestionBlock cho FE.
 */
const questionBlockSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
        },
        section: {
            type: String,
            enum: ["vocabulary", "grammar", "reading", "listening"],
            required: [true, "Section is required"],
            index: true,
        },
        level: {
            type: String,
            enum: ["N5", "N4", "N3", "N2", "N1"],
            required: [true, "JLPT level is required"],
            index: true,
        },
        questionType: {
            type: String,
            trim: true,
        },
        // Context dùng chung cho tất cả câu hỏi trong block
        // null/undefined = standalone (câu đơn)
        context: {
            text: String, // Đoạn văn đọc hiểu
            audioUrl: String, // URL audio (listening)
            audioScript: String, // Transcript bài nghe
            imageUrl: String, // URL hình ảnh minh họa
        },
        instructions: String,
        tags: [String],
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "medium",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true },
);

// Compound indexes
questionBlockSchema.index({ section: 1, level: 1 });
questionBlockSchema.index({ createdBy: 1 });
questionBlockSchema.index({ createdAt: -1 });
questionBlockSchema.index({ section: 1, level: 1, isActive: 1 });

// Full-text search index (case-insensitive, diacritics-insensitive)
questionBlockSchema.index({
    title: "text",
    questionType: "text",
    "context.text": "text",
    instructions: "text",
    tags: "text",
});

export default mongoose.model("QuestionBlock", questionBlockSchema);
