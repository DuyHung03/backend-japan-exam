import mongoose from "mongoose";

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
        startTime: {
            type: Date,
            required: true,
            default: Date.now,
        },
        endTime: Date,
        submitTime: Date,
        duration: Number,
        answers: [
            {
                question: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Question",
                },
                selectedAnswer: String,
                isCorrect: Boolean,
                timeSpent: Number,
                order: Number,
            },
        ],
        results: {
            totalQuestions: Number,
            correctAnswers: Number,
            wrongAnswers: Number,
            skippedAnswers: Number,
            sectionScores: [
                {
                    sectionType: String,
                    correctAnswers: Number,
                    totalQuestions: Number,
                    score: Number,
                    maxScore: Number,
                    passed: Boolean,
                },
            ],
            categoryScores: [
                {
                    category: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "QuestionCategory",
                    },
                    correctAnswers: Number,
                    totalQuestions: Number,
                    accuracy: Number,
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
        aiAnalysis: {
            strengths: [String],
            weaknesses: [String],
            recommendations: [String],
            skillLevels: [
                {
                    skill: String,
                    level: {
                        type: String,
                        enum: ["weak", "average", "good", "excellent"],
                    },
                    score: Number,
                },
            ],
            generatedAt: Date,
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
