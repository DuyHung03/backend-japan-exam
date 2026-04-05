import { examFeedbackService } from "../services/index.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

/**
 * Create comment / report / feedback.
 */
export const create = asyncHandler(async (req, res) => {
    const userId = req.user?.id || null;
    const feedback = await examFeedbackService.create(req.body, userId);
    ApiResponse.created(res, { feedback }, "Feedback created");
});

/**
 * List top-level feedbacks for an exam.
 */
export const list = asyncHandler(async (req, res) => {
    const { examId, type, page, limit } = req.body;
    const {
        data,
        total,
        page: p,
        limit: l,
    } = await examFeedbackService.list({
        examId,
        type,
        page,
        limit,
    });
    ApiResponse.paginate(res, data, p, l, total, "Feedbacks retrieved");
});

/**
 * List replies for a parent feedback.
 */
export const listReplies = asyncHandler(async (req, res) => {
    const { parentId, page, limit } = req.body;
    const {
        data,
        total,
        page: p,
        limit: l,
    } = await examFeedbackService.listReplies({
        parentId,
        page,
        limit,
    });
    ApiResponse.paginate(res, data, p, l, total, "Replies retrieved");
});

/**
 * Get average rating.
 */
export const getRating = asyncHandler(async (req, res) => {
    const { examId } = req.body;
    const rating = await examFeedbackService.getRating(examId);
    ApiResponse.success(res, rating);
});

/**
 * Delete own feedback (or admin).
 */
export const remove = asyncHandler(async (req, res) => {
    const result = await examFeedbackService.remove(
        req.body.feedbackId,
        req.user.id,
        req.user.role,
    );
    ApiResponse.success(res, result, "Feedback deleted");
});

/**
 * Update status (admin only).
 */
export const updateStatus = asyncHandler(async (req, res) => {
    const { feedbackId, status } = req.body;
    const feedback = await examFeedbackService.updateStatus(feedbackId, status);
    ApiResponse.success(res, { feedback }, "Status updated");
});

/**
 * List reports for exams created by the authenticated creator.
 */
export const myReports = asyncHandler(async (req, res) => {
    const { page, limit } = req.body;
    const result = await examFeedbackService.listReportsByCreator(req.user.id, { page, limit });
    ApiResponse.paginate(
        res,
        result.data,
        result.page,
        result.limit,
        result.total,
        "Reports retrieved",
    );
});
