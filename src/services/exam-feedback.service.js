import mongoose from "mongoose";
import { examFeedbackRepository, examRepository } from "../repositories/index.js";
import { AuthorizationError, NotFoundError } from "../utils/errors.js";

class ExamFeedbackService {
    /**
     * Create a comment, report, or feedback.
     */
    async create(
        { examId, type, content, rating, reportCategory, questionRef, parentId, guestName },
        userId,
    ) {
        const exam = await examRepository.findById(examId);
        if (!exam) throw new NotFoundError("Exam");

        const doc = {
            exam: examId,
            user: userId || null,
            guestName: userId ? null : guestName || "Ẩn danh",
            type,
            content,
            parentId: parentId || null,
        };

        if (type === "feedback" && rating) doc.rating = rating;
        if (type === "report" && reportCategory) doc.reportCategory = reportCategory;
        if (questionRef) doc.questionRef = questionRef;

        const created = await examFeedbackRepository.create(doc);
        return created.populate("user", "fullName avatar email");
    }

    /**
     * List feedbacks (top-level) for an exam.
     */
    async list({ examId, type, page = 1, limit = 20 }) {
        const result = await examFeedbackRepository.listByExam({
            examId,
            type,
            parentId: null,
            page,
            limit,
        });

        // Attach reply counts
        if (result.data.length > 0) {
            const parentIds = result.data.map((d) => new mongoose.Types.ObjectId(d._id));
            const replyCounts = await examFeedbackRepository.countReplies(parentIds);
            result.data = result.data.map((d) => ({
                ...d,
                replyCount: replyCounts[d._id.toString()] || 0,
            }));
        }

        return result;
    }

    /**
     * List replies for a parent feedback.
     */
    async listReplies({ parentId, page = 1, limit = 50 }) {
        return examFeedbackRepository.listByExam({
            examId: null, // not used when parentId is set
            type: null,
            parentId,
            page,
            limit,
        });
    }

    /**
     * Get average rating for an exam.
     */
    async getRating(examId) {
        const exam = await examRepository.findById(examId);
        if (!exam) throw new NotFoundError("Exam");
        return examFeedbackRepository.getAverageRating(new mongoose.Types.ObjectId(examId));
    }

    /**
     * Delete a feedback (owner or admin).
     */
    async remove(feedbackId, userId, userRole) {
        const feedback = await examFeedbackRepository.findById(feedbackId);
        if (!feedback) throw new NotFoundError("Feedback");

        const isOwner = feedback.user && feedback.user.toString() === userId;
        if (!isOwner && userRole !== "admin") {
            throw new AuthorizationError("Not authorized to delete this feedback");
        }

        await examFeedbackRepository.deleteById(feedbackId);
        return { deleted: true };
    }

    /**
     * Update status (admin only — hide / resolve reports).
     */
    async updateStatus(feedbackId, status) {
        const feedback = await examFeedbackRepository.findById(feedbackId);
        if (!feedback) throw new NotFoundError("Feedback");
        feedback.status = status;
        await feedback.save();
        return feedback;
    }

    /**
     * List reports for exams created by a specific user.
     */
    async listReportsByCreator(userId, { page = 1, limit = 20 } = {}) {
        // Find all exams created by this user
        const exams = await examRepository.find(
            { createdBy: userId },
            { select: "_id", lean: true },
        );
        const examIds = exams.map((e) => e._id);
        if (examIds.length === 0) return { data: [], total: 0, page, limit };

        return examFeedbackRepository.listReportsByCreator(examIds, { page, limit });
    }
}

export default new ExamFeedbackService();
