import QuestionBlock from "../models/question-block.model.js";
import Question from "../models/question.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

/**
 * Thêm câu hỏi vào block đã tồn tại
 * POST /questions/add-to-block
 * Body: { blockId, questions: [{ questionText, options, correctAnswer, ... }] }
 */
export const addQuestionsToBlock = asyncHandler(async (req, res) => {
    const { blockId, questions: questionsData } = req.body;

    const block = await QuestionBlock.findById(blockId);
    if (!block) {
        return ApiResponse.error(res, "Question block not found", 404);
    }

    // Tìm orderInBlock lớn nhất hiện có
    const lastQuestion = await Question.findOne({ block: blockId })
        .sort({ orderInBlock: -1 })
        .lean();
    const startOrder = (lastQuestion?.orderInBlock ?? 0) + 1;

    const docs = questionsData.map((q, index) => ({
        ...q,
        block: blockId,
        orderInBlock: q.orderInBlock ?? startOrder + index,
        createdBy: req.user.id,
    }));

    const created = await Question.insertMany(docs);

    ApiResponse.created(
        res,
        { questions: created, count: created.length },
        "Questions added to block successfully",
    );
});

/**
 * Chi tiết một câu hỏi
 * POST /questions/get-by-id
 */
export const getQuestionById = asyncHandler(async (req, res) => {
    const { questionId } = req.body;

    const question = await Question.findById(questionId)
        .populate({
            path: "block",
            select: "title section level context",
        })
        .populate("createdBy", "fullName email");

    if (!question) {
        return ApiResponse.error(res, "Question not found", 404);
    }

    ApiResponse.success(res, { question });
});

/**
 * Cập nhật câu hỏi
 * POST /questions/update
 */
export const updateQuestion = asyncHandler(async (req, res) => {
    const { questionId, ...updateData } = req.body;

    const question = await Question.findById(questionId);
    if (!question) {
        return ApiResponse.error(res, "Question not found", 404);
    }

    if (req.user.role === "teacher" && question.createdBy.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized to update this question", 403);
    }

    const updated = await Question.findByIdAndUpdate(questionId, updateData, {
        new: true,
        runValidators: true,
    });

    ApiResponse.success(res, { question: updated }, "Question updated successfully");
});

/**
 * Xóa câu hỏi
 * POST /questions/delete
 */
export const deleteQuestion = asyncHandler(async (req, res) => {
    const { questionId } = req.body;

    const question = await Question.findById(questionId);
    if (!question) {
        return ApiResponse.error(res, "Question not found", 404);
    }

    if (req.user.role === "teacher" && question.createdBy.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized to delete this question", 403);
    }

    await question.deleteOne();

    ApiResponse.success(res, null, "Question deleted successfully");
});
