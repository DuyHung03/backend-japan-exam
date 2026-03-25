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
