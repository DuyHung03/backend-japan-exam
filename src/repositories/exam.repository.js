import Exam from "../models/exam.model.js";
import BaseRepository from "./base.repository.js";

class ExamRepository extends BaseRepository {
    constructor() {
        super(Exam);
    }

    /**
     * Search exams with role-based filtering.
     */
    async searchExams({ page = 1, limit = 20, level, status, search, userRole, userId, sort }) {
        const filter = {};

        // Role-based visibility
        if (userRole === "creator") {
            filter.createdBy = userId;
        } else if (userRole === "user") {
            filter.status = "published";
            filter.isPublic = true;
        }

        if (level) filter.level = level;
        if (status && userRole !== "user") filter.status = status;

        if (search) {
            const searchCondition = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { examCode: { $regex: search, $options: "i" } },
            ];
            if (filter.$or) {
                filter.$and = [{ $or: filter.$or }, { $or: searchCondition }];
                delete filter.$or;
            } else {
                filter.$or = searchCondition;
            }
        }

        const SORT_MAP = {
            newest: { createdAt: -1 },
            oldest: { createdAt: 1 },
        };
        const resolvedSort = SORT_MAP[sort] || { isFeatured: -1, createdAt: -1 };

        return this.paginate(filter, {
            page,
            limit,
            sort: resolvedSort,
            select: "-sections",
            populate: { path: "createdBy", select: "fullName email" },
        });
    }

    async getByIdWithCreator(examId) {
        return this.findById(examId, {
            populate: { path: "createdBy", select: "fullName email" },
            lean: true,
        });
    }

    async incrementViewCount(examId) {
        return this.model.findByIdAndUpdate(examId, { $inc: { viewCount: 1 } });
    }

    async incrementAttemptCount(examId) {
        return this.model.findByIdAndUpdate(examId, { $inc: { attemptCount: 1 } });
    }

    async getExamInfo(examId) {
        return this.findById(examId, {
            select: "title level description instructions duration totalQuestions totalPoints passingScore status isPublic examCode sections.sectionType sections.sectionName sections.duration sections.questionCount sections.points sections.passingScore sections.blocks.questions attemptCount viewCount",
            lean: true,
        });
    }

    async countByLevel() {
        return this.aggregate([{ $group: { _id: "$level", count: { $sum: 1 } } }]);
    }

    /**
     * List published+public exams (for unauthenticated students).
     */
    async listPublicExams({ page = 1, limit = 20, level, search }) {
        const filter = { status: "published", isPublic: true };
        if (level) filter.level = level;

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { examCode: { $regex: search, $options: "i" } },
            ];
        }

        return this.paginate(filter, {
            page,
            limit,
            sort: { isFeatured: -1, createdAt: -1 },
            select: "-sections",
            populate: { path: "createdBy", select: "fullName" },
        });
    }

    /**
     * Cập nhật câu hỏi embedded trong exam (explanation, translationVi, ...).
     * Dùng positional operator $[elem] để tìm đúng câu hỏi trong nested array.
     */
    async updateEmbeddedQuestion(examId, questionId, updateData) {
        const setFields = {};
        for (const [key, value] of Object.entries(updateData)) {
            setFields[`sections.$[].blocks.$[].questions.$[q].${key}`] = value;
        }

        return this.model.findByIdAndUpdate(
            examId,
            { $set: setFields },
            {
                arrayFilters: [{ "q._id": questionId }],
                new: true,
            },
        );
    }
}

export default new ExamRepository();
