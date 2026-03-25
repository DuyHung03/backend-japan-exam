import mongoose from "mongoose";

/**
 * ExamFeedback - Comment, Report, Feedback cho đề thi
 *
 * type:
 *   - comment: bình luận / thảo luận về đề thi
 *   - report:  báo lỗi (đáp án sai, câu hỏi trùng, audio hỏng…)
 *   - feedback: đánh giá chung (rating + nhận xét)
 */
const examFeedbackSchema = new mongoose.Schema(
    {
        exam: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exam",
            required: true,
            index: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null, // null = guest
        },
        guestName: {
            type: String,
            default: null,
            trim: true,
            maxlength: 50,
        },
        type: {
            type: String,
            enum: ["comment", "report", "feedback"],
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },

        // ── Feedback-specific fields ──
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: null, // only used when type = "feedback"
        },

        // ── Report-specific fields ──
        reportCategory: {
            type: String,
            enum: [
                "wrong_answer",
                "duplicate_question",
                "broken_media",
                "unclear_question",
                "other",
            ],
            default: null, // only used when type = "report"
        },
        questionRef: {
            type: String, // ID hoặc text, không bắt buộc
            default: null,
        },

        // ── Moderation ──
        status: {
            type: String,
            enum: ["visible", "hidden", "resolved"],
            default: "visible",
        },

        // ── Reply / thread (đơn giản 1 cấp) ──
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExamFeedback",
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

// Compound index for efficient listing
examFeedbackSchema.index({ exam: 1, type: 1, createdAt: -1 });
examFeedbackSchema.index({ exam: 1, parentId: 1 });

export default mongoose.model("ExamFeedback", examFeedbackSchema);
