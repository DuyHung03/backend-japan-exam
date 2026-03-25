import { questionBlockService } from "../services/index.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

export const addQuestionsToBlock = asyncHandler(async (req, res) => {
    const result = await questionBlockService.addQuestionsToBlock(
        req.body.blockId,
        req.body.questions,
        req.user.id,
    );
    ApiResponse.created(res, result, "Questions added to block successfully");
});

export const getQuestionById = asyncHandler(async (req, res) => {
    const question = await questionBlockService.getQuestionById(req.body.questionId);
    ApiResponse.success(res, { question });
});

export const updateQuestion = asyncHandler(async (req, res) => {
    const { questionId, ...updateData } = req.body;
    const question = await questionBlockService.updateQuestion(questionId, updateData, req.user);
    ApiResponse.success(res, { question }, "Question updated successfully");
});

export const deleteQuestion = asyncHandler(async (req, res) => {
    await questionBlockService.deleteQuestion(req.body.questionId, req.user);
    ApiResponse.success(res, null, "Question deleted successfully");
});
