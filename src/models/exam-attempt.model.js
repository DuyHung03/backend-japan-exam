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

        // ===== Chế độ thi =====
        mode: {
            type: String,
            enum: ["full_test", "practice"],
            default: "full_test",
        },
        allowedDuration: Number, // phút — giới hạn thời gian server-side
        filteredSections: [String], // sectionType list khi practice

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
            // Điểm theo nhóm tính điểm chuẩn JLPT (scoring groups)
            scoringGroupScores: [
                {
                    groupId: String, // "language_knowledge", "reading", "listening", "language_knowledge_reading"
                    groupName: String, // Tên tiếng Nhật
                    groupNameVi: String, // Tên tiếng Việt
                    correctAnswers: Number,
                    totalQuestions: Number,
                    score: Number, // Điểm scaled (0-60 hoặc 0-120)
                    maxScore: Number,
                    minScore: Number, // Điểm tối thiểu cần đạt
                    passed: Boolean,
                },
            ],
            totalScore: Number,
            maxScore: Number,
            passingTotal: Number, // Điểm tổng cần đạt theo JLPT
            percentage: Number,
            passed: Boolean,
            allGroupsPassed: Boolean, // Tất cả nhóm tính điểm đều đạt min?
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
