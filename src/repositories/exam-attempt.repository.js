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
}

export default new ExamAttemptRepository();
