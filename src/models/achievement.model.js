import mongoose from "mongoose";

/**
 * Achievement definitions (static list seeded once).
 */
const achievementDefSchema = new mongoose.Schema({
    code: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    titleVi: { type: String, required: true },
    description: { type: String },
    descriptionVi: { type: String },
    icon: { type: String, default: "trophy" },
    category: {
        type: String,
        enum: ["milestone", "streak", "score", "practice"],
        default: "milestone",
    },
    condition: {
        type: { type: String, enum: ["attempts", "streak", "score", "passed", "perfect"] },
        value: Number,
    },
    order: { type: Number, default: 0 },
});

export const AchievementDef = mongoose.model("AchievementDef", achievementDefSchema);

/**
 * UserAchievement - tracks which user earned which achievement.
 */
const userAchievementSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        achievement: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AchievementDef",
            required: true,
        },
        earnedAt: { type: Date, default: Date.now },
    },
    { timestamps: false },
);

userAchievementSchema.index({ user: 1, achievement: 1 }, { unique: true });

export const UserAchievement = mongoose.model("UserAchievement", userAchievementSchema);