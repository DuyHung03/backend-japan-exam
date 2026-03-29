import ExamAttempt from "../models/exam-attempt.model.js";
import BaseRepository from "./base.repository.js";

class ExamAttemptRepository extends BaseRepository {
    constructor() {
        super(ExamAttempt);
    }

    async findInProgress(userId, examId, mode = "full_test") {
        return this.findOne({
            user: userId,
            exam: examId,
            status: "in_progress",
            mode,
        });
    }

    async getWithUser(attemptId) {
        return this.findById(attemptId, {
            populate: { path: "user", select: "fullName email" },
        });
    }

    async getWithExamAndUser(attemptId) {
        return this.findById(attemptId, {
            populate: [{ path: "exam" }, { path: "user", select: "fullName email" }],
        });
    }

    async getUserAttempts({ userId, page = 1, limit = 20, examId, status, search, examIds }) {
        const filter = { user: userId };

        if (examId) filter.exam = examId;
        if (status) filter.status = status;
        if (examIds) filter.exam = { $in: examIds };

        return this.paginate(filter, {
            page,
            limit,
            sort: { startTime: -1 },
            select: "-answers",
            populate: { path: "exam", select: "title examCode level totalPoints duration" },
        });
    }

    async getRecentSubmitted(limitCount = 10) {
        return this.find(
            { status: "submitted" },
            {
                populate: [
                    { path: "user", select: "fullName email" },
                    { path: "exam", select: "title examCode level" },
                ],
                select: "user exam results.totalScore results.passed startTime",
                sort: { startTime: -1 },
                limit: limitCount,
            },
        );
    }

    /**
     * Streak – số ngày liên tiếp có bài submitted (tính từ hôm nay lùi ngược).
     */
    async getStreak(userId) {
        const days = await this.aggregate([
            { $match: { user: userId, status: "submitted" } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$startTime" },
                    },
                },
            },
            { $sort: { _id: -1 } },
        ]);

        if (!days.length) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < days.length; i++) {
            const d = new Date(days[i]._id);
            d.setHours(0, 0, 0, 0);
            const expected = new Date(today);
            expected.setDate(expected.getDate() - i);
            expected.setHours(0, 0, 0, 0);

            if (d.getTime() === expected.getTime()) {
                streak++;
            } else if (i === 0 && streak === 0) {
                // If no exam today, shift by 1 day
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                if (d.getTime() === yesterday.getTime()) {
                    streak = 1;
                    today.setDate(today.getDate() - 1); // shift base
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        return streak;
    }

    /**
     * Điểm theo ngày (scores by day) – last N days.
     */
    async getScoresByDay(userId, days = 30) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        since.setHours(0, 0, 0, 0);

        return this.aggregate([
            { $match: { user: userId, status: "submitted", startTime: { $gte: since } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$startTime" } },
                    avgPercentage: { $avg: "$results.percentage" },
                    bestPercentage: { $max: "$results.percentage" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
    }

    /**
     * Điểm trung bình theo kỹ năng (radar chart).
     */
    async getScoresBySection(userId) {
        return this.aggregate([
            { $match: { user: userId, status: "submitted" } },
            { $unwind: "$results.sectionScores" },
            {
                $group: {
                    _id: "$results.sectionScores.sectionType",
                    avgScore: {
                        $avg: {
                            $cond: [
                                { $gt: ["$results.sectionScores.totalQuestions", 0] },
                                {
                                    $multiply: [
                                        {
                                            $divide: [
                                                "$results.sectionScores.correctAnswers",
                                                "$results.sectionScores.totalQuestions",
                                            ],
                                        },
                                        100,
                                    ],
                                },
                                0,
                            ],
                        },
                    },
                    totalAttempts: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
    }

    /**
     * Tỷ lệ đúng sai theo cấp độ (bar chart data).
     */
    async getAccuracyByLevel(userId) {
        return this.aggregate([
            { $match: { user: userId, status: "submitted" } },
            {
                $lookup: {
                    from: "exams",
                    localField: "exam",
                    foreignField: "_id",
                    as: "examData",
                },
            },
            { $unwind: "$examData" },
            {
                $group: {
                    _id: "$examData.level",
                    totalCorrect: { $sum: "$results.correctAnswers" },
                    totalWrong: { $sum: "$results.wrongAnswers" },
                    totalSkipped: { $sum: "$results.skippedAnswers" },
                    avgPercentage: { $avg: "$results.percentage" },
                    attempts: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
    }

    /**
     * Lấy 2 lần làm bài gần nhất cho cùng 1 exam (so sánh).
     */
    async getRecentPairForComparison(userId) {
        // Find latest submitted attempt
        const latest = await this.findOne(
            { user: userId, status: "submitted" },
            {
                sort: { startTime: -1 },
                select: "exam",
                lean: true,
            },
        );
        if (!latest) return [];

        // Find 2 most recent attempts for the same exam
        return this.find(
            { user: userId, exam: latest.exam, status: "submitted" },
            {
                sort: { startTime: -1 },
                limit: 2,
                populate: { path: "exam", select: "title examCode level totalPoints" },
                select: "exam results startTime duration mode",
                lean: true,
            },
        );
    }

    /**
     * Lấy tất cả câu sai từ các attempt gần đây.
     */
    async getWrongQuestions(userId, limitAttempts = 10) {
        return this.aggregate([
            { $match: { user: userId, status: "submitted" } },
            { $sort: { startTime: -1 } },
            { $limit: limitAttempts },
            { $unwind: "$answers" },
            { $match: { "answers.isCorrect": false, "answers.selectedAnswer": { $ne: null } } },
            {
                $group: {
                    _id: {
                        examId: "$exam",
                        questionId: "$answers.questionId",
                    },
                    sectionType: { $first: "$answers.sectionType" },
                    selectedAnswer: { $last: "$answers.selectedAnswer" },
                    attemptId: { $last: "$_id" },
                    wrongCount: { $sum: 1 },
                    lastWrongAt: { $max: "$startTime" },
                },
            },
            { $sort: { lastWrongAt: -1 } },
        ]);
    }

    /**
     * Leaderboard – top users by avg percentage.
     */
    async getLeaderboard({ period, level, limit = 20 }) {
        const match = { status: "submitted" };
        if (period) {
            const since = new Date();
            if (period === "week") since.setDate(since.getDate() - 7);
            else if (period === "month") since.setMonth(since.getMonth() - 1);
            match.startTime = { $gte: since };
        }

        const pipeline = [{ $match: match }];

        if (level) {
            pipeline.push(
                {
                    $lookup: {
                        from: "exams",
                        localField: "exam",
                        foreignField: "_id",
                        as: "examData",
                    },
                },
                { $unwind: "$examData" },
                { $match: { "examData.level": level } },
            );
        }

        pipeline.push(
            {
                $group: {
                    _id: "$user",
                    avgPercentage: { $avg: "$results.percentage" },
                    totalScore: { $sum: "$results.totalScore" },
                    totalAttempts: { $sum: 1 },
                    totalPassed: { $sum: { $cond: ["$results.passed", 1, 0] } },
                    bestPercentage: { $max: "$results.percentage" },
                },
            },
            { $sort: { avgPercentage: -1, totalScore: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $project: {
                    _id: 1,
                    avgPercentage: { $round: ["$avgPercentage", 1] },
                    totalScore: 1,
                    totalAttempts: 1,
                    totalPassed: 1,
                    bestPercentage: 1,
                    "user.fullName": 1,
                    "user.avatar": 1,
                    "user.email": 1,
                },
            },
        );

        return this.aggregate(pipeline);
    }

    /**
     * Thống kê tổng hợp cho user profile.
     */
    async getUserStats(userId) {
        const [stats] = await this.aggregate([
            { $match: { user: userId, status: "submitted" } },
            {
                $group: {
                    _id: null,
                    totalAttempts: { $sum: 1 },
                    totalPassed: { $sum: { $cond: ["$results.passed", 1, 0] } },
                    avgPercentage: { $avg: "$results.percentage" },
                    avgDuration: { $avg: "$duration" },
                    bestScore: { $max: "$results.percentage" },
                    totalTime: { $sum: "$duration" },
                },
            },
        ]);

        const byLevel = await this.aggregate([
            { $match: { user: userId, status: "submitted" } },
            {
                $lookup: {
                    from: "exams",
                    localField: "exam",
                    foreignField: "_id",
                    as: "examData",
                },
            },
            { $unwind: "$examData" },
            {
                $group: {
                    _id: "$examData.level",
                    attempts: { $sum: 1 },
                    passed: { $sum: { $cond: ["$results.passed", 1, 0] } },
                    avgPercentage: { $avg: "$results.percentage" },
                    bestScore: { $max: "$results.percentage" },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const recentAttempts = await this.find(
            { user: userId, status: "submitted" },
            {
                populate: { path: "exam", select: "title examCode level totalPoints" },
                select: "exam results.totalScore results.maxScore results.percentage results.passed results.rank startTime duration mode",
                sort: { startTime: -1 },
                limit: 10,
                lean: true,
            },
        );

        return {
            summary: stats || {
                totalAttempts: 0,
                totalPassed: 0,
                avgPercentage: 0,
                avgDuration: 0,
                bestScore: 0,
                totalTime: 0,
            },
            byLevel,
            recentAttempts,
        };
    }
}

export default new ExamAttemptRepository();
