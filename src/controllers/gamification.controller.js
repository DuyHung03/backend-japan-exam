import mongoose from "mongoose";
import { AchievementDef, UserAchievement } from "../models/achievement.model.js";
import StudyGoal from "../models/study-goal.model.js";
import ExamAttempt from "../models/exam-attempt.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

// ── Achievement definitions (seed if not exists) ──
const ACHIEVEMENT_SEEDS = [
    { code: "first_exam", titleVi: "Bài thi đầu tiên", title: "First Exam", descriptionVi: "Hoàn thành bài thi đầu tiên", icon: "rocket", category: "milestone", condition: { type: "attempts", value: 1 }, order: 1 },
    { code: "five_exams", titleVi: "Chiến binh", title: "Warrior", descriptionVi: "Hoàn thành 5 bài thi", icon: "swords", category: "milestone", condition: { type: "attempts", value: 5 }, order: 2 },
    { code: "ten_exams", titleVi: "Kiên trì", title: "Persistent", descriptionVi: "Hoàn thành 10 bài thi", icon: "flame", category: "milestone", condition: { type: "attempts", value: 10 }, order: 3 },
    { code: "twenty_exams", titleVi: "Không ngừng tiến bước", title: "Unstoppable", descriptionVi: "Hoàn thành 20 bài thi", icon: "zap", category: "milestone", condition: { type: "attempts", value: 20 }, order: 4 },
    { code: "streak_3", titleVi: "3 ngày liên tiếp", title: "3 Day Streak", descriptionVi: "Học 3 ngày liên tiếp", icon: "calendar-check", category: "streak", condition: { type: "streak", value: 3 }, order: 5 },
    { code: "streak_7", titleVi: "1 tuần kiên định", title: "7 Day Streak", descriptionVi: "Học 7 ngày liên tiếp", icon: "calendar-heart", category: "streak", condition: { type: "streak", value: 7 }, order: 6 },
    { code: "streak_30", titleVi: "1 tháng bất khuất", title: "30 Day Streak", descriptionVi: "Học 30 ngày liên tiếp", icon: "crown", category: "streak", condition: { type: "streak", value: 30 }, order: 7 },
    { code: "first_pass", titleVi: "Đạt lần đầu", title: "First Pass", descriptionVi: "Đạt bài thi đầu tiên", icon: "check-circle", category: "score", condition: { type: "passed", value: 1 }, order: 8 },
    { code: "five_passes", titleVi: "Học sinh giỏi", title: "Honor Student", descriptionVi: "Đạt 5 bài thi", icon: "award", category: "score", condition: { type: "passed", value: 5 }, order: 9 },
    { code: "perfect_score", titleVi: "Điểm tuyệt đối", title: "Perfect Score", descriptionVi: "Đạt 100% trong một bài thi", icon: "star", category: "score", condition: { type: "perfect", value: 100 }, order: 10 },
    { code: "score_90", titleVi: "Xuất sắc", title: "Excellent", descriptionVi: "Đạt 90% trở lên", icon: "medal", category: "score", condition: { type: "score", value: 90 }, order: 11 },
];

async function ensureAchievementDefs() {
    const count = await AchievementDef.countDocuments();
    if (count === 0) {
        await AchievementDef.insertMany(ACHIEVEMENT_SEEDS);
    }
}

// ── Check and award achievements for a user ──
async function checkAndAward(userId) {
    await ensureAchievementDefs();
    const allDefs = await AchievementDef.find().lean();
    const earned = await UserAchievement.find({ user: userId }).lean();
    const earnedCodes = new Set(earned.map((e) => e.achievement.toString()));

    const oid = new mongoose.Types.ObjectId(userId);

    // Gather user stats
    const [attemptStats] = await ExamAttempt.aggregate([
        { $match: { user: oid, status: "submitted" } },
        {
            $group: {
                _id: null,
                totalAttempts: { $sum: 1 },
                totalPassed: { $sum: { $cond: ["$results.passed", 1, 0] } },
                bestPercentage: { $max: "$results.percentage" },
            },
        },
    ]);

    const stats = attemptStats || { totalAttempts: 0, totalPassed: 0, bestPercentage: 0 };

    // Calculate streak
    const days = await ExamAttempt.aggregate([
        { $match: { user: oid, status: "submitted" } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$startTime" } } } },
        { $sort: { _id: -1 } },
    ]);

    let streak = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i < days.length; i++) {
        const d = new Date(days[i]._id); d.setHours(0, 0, 0, 0);
        const expected = new Date(today); expected.setDate(expected.getDate() - i); expected.setHours(0, 0, 0, 0);
        if (d.getTime() === expected.getTime()) streak++;
        else if (i === 0) {
            const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
            if (d.getTime() === yesterday.getTime()) { streak = 1; today.setDate(today.getDate() - 1); }
            else break;
        } else break;
    }

    const newAchievements = [];
    for (const def of allDefs) {
        if (earnedCodes.has(def._id.toString())) continue;
        let earned = false;
        switch (def.condition?.type) {
            case "attempts": earned = stats.totalAttempts >= def.condition.value; break;
            case "passed": earned = stats.totalPassed >= def.condition.value; break;
            case "streak": earned = streak >= def.condition.value; break;
            case "score": earned = stats.bestPercentage >= def.condition.value; break;
            case "perfect": earned = stats.bestPercentage >= 100; break;
        }
        if (earned) {
            await UserAchievement.create({ user: userId, achievement: def._id });
            newAchievements.push(def);
        }
    }
    return newAchievements;
}

// ── Controllers ──

export const getAchievements = asyncHandler(async (req, res) => {
    await ensureAchievementDefs();
    const allDefs = await AchievementDef.find().sort({ order: 1 }).lean();
    const earned = await UserAchievement.find({ user: req.user.id }).lean();
    const earnedMap = new Map(earned.map((e) => [e.achievement.toString(), e.earnedAt]));

    const result = allDefs.map((def) => ({
        ...def,
        earned: earnedMap.has(def._id.toString()),
        earnedAt: earnedMap.get(def._id.toString()) || null,
    }));

    ApiResponse.success(res, result, "Achievements retrieved");
});

export const checkNewAchievements = asyncHandler(async (req, res) => {
    const newOnes = await checkAndAward(req.user.id);
    ApiResponse.success(res, { newAchievements: newOnes }, newOnes.length ? "New achievements earned!" : "No new achievements");
});

// ── Study Goals ──

export const getStudyGoal = asyncHandler(async (req, res) => {
    let goal = await StudyGoal.findOne({ user: req.user.id });
    if (!goal) {
        goal = await StudyGoal.create({ user: req.user.id });
    }

    const oid = new mongoose.Types.ObjectId(req.user.id);

    // Today's progress
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [todayStats] = await ExamAttempt.aggregate([
        { $match: { user: oid, status: "submitted", startTime: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, questionsAnswered: { $sum: "$results.totalQuestions" }, examsCompleted: { $sum: 1 } } },
    ]);

    // This week's progress
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [weekStats] = await ExamAttempt.aggregate([
        { $match: { user: oid, status: "submitted", startTime: { $gte: weekStart } } },
        { $group: { _id: null, examsCompleted: { $sum: 1 } } },
    ]);

    ApiResponse.success(res, {
        goal: goal.toObject(),
        progress: {
            daily: {
                questionsAnswered: todayStats?.questionsAnswered || 0,
                target: goal.dailyQuestions,
            },
            weekly: {
                examsCompleted: weekStats?.examsCompleted || 0,
                target: goal.weeklyExams,
            },
        },
    });
});

export const updateStudyGoal = asyncHandler(async (req, res) => {
    const { dailyQuestions, weeklyExams } = req.body;
    let goal = await StudyGoal.findOne({ user: req.user.id });
    if (!goal) {
        goal = await StudyGoal.create({ user: req.user.id, dailyQuestions, weeklyExams });
    } else {
        if (dailyQuestions !== undefined) goal.dailyQuestions = dailyQuestions;
        if (weeklyExams !== undefined) goal.weeklyExams = weeklyExams;
        await goal.save();
    }
    ApiResponse.success(res, { goal }, "Study goal updated");
});