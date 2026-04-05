import ExamFeedback from "../models/exam-feedback.model.js";
import BaseRepository from "./base.repository.js";

class ExamFeedbackRepository extends BaseRepository {
    constructor() {
        super(ExamFeedback);
    }

    /**
     * List feedbacks for an exam, with optional type & parent filter.
     */
    async listByExam({ examId, type, parentId = null, page = 1, limit = 20, sort = "-createdAt" }) {
        const filter = { status: { $ne: "hidden" } };
        if (examId) filter.exam = examId;
        if (type) filter.type = type;
        if (parentId === null)
            filter.parentId = null; // top-level only
        else filter.parentId = parentId;

        const total = await this.model.countDocuments(filter);
        const data = await this.model
            .find(filter)
            .populate("user", "fullName avatar email")
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        return { data, total, page, limit };
    }

    /**
     * Count replies for a set of parent IDs.
     */
    async countReplies(parentIds) {
        const counts = await this.model.aggregate([
            { $match: { parentId: { $in: parentIds }, status: { $ne: "hidden" } } },
            { $group: { _id: "$parentId", count: { $sum: 1 } } },
        ]);
        const map = {};
        for (const c of counts) map[c._id.toString()] = c.count;
        return map;
    }

    /**
     * Average rating for an exam (feedback type only).
     */
    async getAverageRating(examId) {
        const result = await this.model.aggregate([
            {
                $match: {
                    exam: examId,
                    type: "feedback",
                    rating: { $ne: null },
                    status: "visible",
                },
            },
            { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
        ]);
        if (result.length === 0) return { avg: 0, count: 0 };
        return { avg: Math.round(result[0].avg * 10) / 10, count: result[0].count };
    }

    /**
     * List reports for exams created by a specific user.
     */
    async listReportsByCreator(examIds, { page = 1, limit = 20 } = {}) {
        const filter = {
            exam: { $in: examIds },
            type: "report",
            status: { $ne: "hidden" },
            parentId: null,
        };

        const total = await this.model.countDocuments(filter);
        const data = await this.model
            .find(filter)
            .populate("user", "fullName avatar email")
            .populate("exam", "title level examCode")
            .sort("-createdAt")
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        return { data, total, page, limit };
    }
}

export default new ExamFeedbackRepository();
