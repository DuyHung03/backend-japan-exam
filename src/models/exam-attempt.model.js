import mongoose from "mongoose";

/**
 * ExamAttempt - Lịch sử làm bài thi
 *
 * Lưu trữ câu trả lời và kết quả của user cho từng bài thi.
 * answers sử dụng questionId (là _id của câu hỏi embedded trong Exam).
 */
const examAttemptSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        exam: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exam",
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["in_progress", "completed", "submitted"],
            default: "in_progress",
            index: true,
        },

        // ===== Thời gian =====
        startTime: {
            type: Date,
            required: true,
            default: Date.now,
        },
        endTime: Date,
        submitTime: Date,
        duration: Number, // giây

        // ===== Câu trả lời =====
        answers: [
            {
                questionId: {
                    type: mongoose.Schema.Types.ObjectId, // _id của embedded question trong exam
                    required: true,
                },
                sectionType: String, // vocabulary, grammar, reading, listening
                selectedAnswer: String,
                isCorrect: Boolean,
                timeSpent: Number, // giây
            },
        ],

        // ===== Kết quả =====
        results: {
            totalQuestions: Number,
            correctAnswers: Number,
            wrongAnswers: Number,
            skippedAnswers: Number,
            sectionScores: [
                {
                    sectionType: String,
                    sectionName: String,
                    correctAnswers: Number,
                    totalQuestions: Number,
                    score: Number,
                    maxScore: Number,
                    passed: Boolean,
                },
            ],
            totalScore: Number,
            maxScore: Number,
            percentage: Number,
            passed: Boolean,
            rank: {
                type: String,
                enum: ["A", "B", "C", "D", "F"],
            },
        },
    },
    {
        timestamps: true,
    },
);

examAttemptSchema.index({ user: 1, exam: 1 });
examAttemptSchema.index({ user: 1, status: 1 });
examAttemptSchema.index({ startTime: -1 });

export default mongoose.model("ExamAttempt", examAttemptSchema);
