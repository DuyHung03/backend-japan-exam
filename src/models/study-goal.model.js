import mongoose from "mongoose";

/**
 * StudyGoal - Mục tiêu học tập (daily/weekly).
 */
const studyGoalSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        dailyQuestions: {
            type: Number,
            default: 20,
            min: 1,
            max: 200,
        },
        weeklyExams: {
            type: Number,
            default: 3,
            min: 1,
            max: 50,
        },
    },
    { timestamps: true },
);

export default mongoose.model("StudyGoal", studyGoalSchema);