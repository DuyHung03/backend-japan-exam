import { examService } from "../services/index.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

export const createExam = asyncHandler(async (req, res) => {
    const exam = await examService.createExam(req.body, req.user.id);
    ApiResponse.created(res, { exam }, "Exam created successfully");
});

export const getExams = asyncHandler(async (req, res) => {
    const { data, total, page, limit } = await examService.getExams({
        ...req.body,
        userRole: req.user.role,
        userId: req.user.id,
    });
    ApiResponse.paginate(res, data, page, limit, total, "Exams retrieved successfully");
});

export const getPublicExams = asyncHandler(async (req, res) => {
    const { data, total, page, limit } = await examService.getPublicExams(req.body);
    ApiResponse.paginate(res, data, page, limit, total, "Exams retrieved successfully");
});

export const getExamById = asyncHandler(async (req, res) => {
    const exam = await examService.getExamById(req.body.examId, req.user);
    ApiResponse.success(res, { exam });
});

export const updateExam = asyncHandler(async (req, res) => {
    const { examId, ...updateData } = req.body;
    const exam = await examService.updateExam(examId, updateData, req.user);
    ApiResponse.success(res, { exam }, "Exam updated successfully");
});

export const addBlockToExam = asyncHandler(async (req, res) => {
    const { examId, sectionIndex, block } = req.body;
    const exam = await examService.addBlockToExam(examId, sectionIndex, block, req.user);
    ApiResponse.success(res, { exam }, "Block added to exam successfully");
});

export const removeBlockFromExam = asyncHandler(async (req, res) => {
    const { examId, sectionIndex, blockIndex } = req.body;
    const exam = await examService.removeBlockFromExam(examId, sectionIndex, blockIndex, req.user);
    ApiResponse.success(res, { exam }, "Block removed from exam successfully");
});

export const updateExamQuestion = asyncHandler(async (req, res) => {
    const { examId, sectionIndex, blockIndex, questionIndex, questionData } = req.body;
    const exam = await examService.updateExamQuestion(
        examId,
        sectionIndex,
        blockIndex,
        questionIndex,
        questionData,
        req.user,
    );
    ApiResponse.success(res, { exam }, "Question updated successfully");
});

export const removeQuestionFromExam = asyncHandler(async (req, res) => {
    const { examId, sectionIndex, blockIndex, questionIndex } = req.body;
    const exam = await examService.removeQuestionFromExam(
        examId,
        sectionIndex,
        blockIndex,
        questionIndex,
        req.user,
    );
    ApiResponse.success(res, { exam }, "Question removed from exam successfully");
});

export const deleteExam = asyncHandler(async (req, res) => {
    await examService.deleteExam(req.body.examId, req.user);
    ApiResponse.success(res, null, "Exam deleted successfully");
});

export const publishExam = asyncHandler(async (req, res) => {
    const exam = await examService.publishExam(req.body.examId, req.user);
    ApiResponse.success(res, { exam }, "Exam published successfully");
});
