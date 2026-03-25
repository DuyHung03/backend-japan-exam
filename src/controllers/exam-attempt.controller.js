import { examAttemptService } from "../services/index.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

export const startExam = asyncHandler(async (req, res) => {
    const userId = req.user?.id || null;
    const result = await examAttemptService.startExam(req.body, userId);
    const statusCode = result.resumed ? 200 : 201;
    const message = result.resumed ? "Resuming exam in progress" : "Exam started successfully";
    ApiResponse.success(res, result, message, statusCode);
});

export const submitExam = asyncHandler(async (req, res) => {
    const { attemptId, answers, examId } = req.body;
    const userId = req.user?.id || null;

    let result;
    if (!userId || !attemptId) {
        // Guest mode → evaluate in-memory (no DB persistence)
        const sectionTypes = null; // full exam
        result = await examAttemptService.evaluatePractice(
            examId || attemptId,
            sectionTypes,
            answers,
        );
        return ApiResponse.success(res, { guestResult: result }, "Exam evaluated successfully");
    }

    result = await examAttemptService.submitExam(attemptId, answers, userId);
    const message = result.timedOut
        ? "Exam auto-submitted (time expired)"
        : "Exam submitted successfully";
    ApiResponse.success(res, result, message);
});

export const evaluatePractice = asyncHandler(async (req, res) => {
    const { examId, sectionTypes, answers } = req.body;
    const result = await examAttemptService.evaluatePractice(examId, sectionTypes, answers);
    ApiResponse.success(res, result);
});

export const getExamInfo = asyncHandler(async (req, res) => {
    const userRole = req.user?.role || "user";
    const exam = await examAttemptService.getExamInfo(req.body.examId, userRole);
    ApiResponse.success(res, { exam });
});

export const getAttemptResult = asyncHandler(async (req, res) => {
    const userId = req.user?.id || null;
    const userRole = req.user?.role || "user";
    if (!userId) {
        return ApiResponse.error(res, "Authentication required to view saved results", 401);
    }
    const result = await examAttemptService.getAttemptResult(req.body.attemptId, userId, userRole);
    ApiResponse.success(res, result);
});

export const getMyAttempts = asyncHandler(async (req, res) => {
    const { data, total, page, limit } = await examAttemptService.getMyAttempts(
        req.user.id,
        req.body,
    );
    ApiResponse.paginate(res, data, page, limit, total, "Attempts retrieved successfully");
});

export const getAttemptById = asyncHandler(async (req, res) => {
    const attempt = await examAttemptService.getAttemptById(
        req.body.attemptId,
        req.user.id,
        req.user.role,
    );
    ApiResponse.success(res, { attempt });
});
