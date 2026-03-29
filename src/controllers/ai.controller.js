import { examRepository, questionRepository } from "../repositories/index.js";
import aiService from "../services/ai.service.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

/**
 * AI giải thích cho câu hỏi trong Question Bank.
 * POST /questions/ai-explain
 *
 * Gọi Gemini AI tạo explanation + translationVi.
 * Nếu có questionId → tự động lưu vào DB.
 * Dùng cho teacher khi tạo/sửa câu hỏi.
 */
export const aiExplainQuestion = asyncHandler(async (req, res) => {
    const { questionText, options, correctAnswer, level, sectionType, context, questionId } =
        req.body;

    if (!questionText || !correctAnswer) {
        throw new BadRequestError("questionText and correctAnswer are required");
    }

    const result = await aiService.generateExplanation({
        questionText,
        options,
        correctAnswer,
        level,
        sectionType,
        context,
    });

    // Nếu có questionId → lưu vào bank question
    if (questionId) {
        try {
            const bankQuestion = await questionRepository.findById(questionId);
            if (bankQuestion && !bankQuestion.explanation) {
                bankQuestion.explanation = result.explanation;
                bankQuestion.translationVi = result.translationVi;
                await bankQuestion.save();
            }
        } catch {
            // Non-critical, không ảnh hưởng flow
        }
    }

    ApiResponse.success(res, result, "AI explanation generated successfully");
});

/**
 * AI giải thích cho câu hỏi trong Exam (student side).
 * POST /questions/ai-explain-exam-question
 *
 * Flow:
 * 1. Tìm câu hỏi embedded trong exam
 * 2. Nếu đã có explanation → trả về luôn
 * 3. Nếu chưa → gọi Gemini AI → lưu vào DB → trả về
 */
export const aiExplainExamQuestion = asyncHandler(async (req, res) => {
    const { examId, questionId } = req.body;

    if (!examId || !questionId) {
        throw new BadRequestError("examId and questionId are required");
    }

    const exam = await examRepository.findById(examId);
    if (!exam) throw new NotFoundError("Exam");

    // Tìm câu hỏi embedded trong exam
    let targetQuestion = null;
    let targetSection = null;
    let targetBlock = null;

    for (const section of exam.sections) {
        for (const block of section.blocks) {
            for (const question of block.questions) {
                if (question._id.toString() === questionId) {
                    targetQuestion = question;
                    targetSection = section;
                    targetBlock = block;
                    break;
                }
            }
            if (targetQuestion) break;
        }
        if (targetQuestion) break;
    }

    if (!targetQuestion) {
        throw new NotFoundError("Question not found in exam");
    }

    // Nếu đã có explanation → trả về luôn
    if (targetQuestion.explanation) {
        return ApiResponse.success(
            res,
            {
                explanation: targetQuestion.explanation,
                translationVi: targetQuestion.translationVi || "",
                source: "database",
            },
            "Explanation found",
        );
    }

    // Chưa có → gọi Gemini AI
    const blockContext = targetBlock.context?.text || "";
    const result = await aiService.generateExplanation({
        questionText: targetQuestion.questionText,
        options: targetQuestion.options,
        correctAnswer: targetQuestion.correctAnswer,
        level: exam.level,
        sectionType: targetSection.sectionType,
        context: blockContext,
    });

    // Lưu explanation vào exam embedded question
    await examRepository.updateEmbeddedQuestion(examId, questionId, {
        explanation: result.explanation,
        translationVi: result.translationVi,
    });

    // Nếu câu hỏi gốc trong bank cũng chưa có explanation → cập nhật luôn
    if (targetQuestion.sourceQuestionId) {
        try {
            const bankQuestion = await questionRepository.findById(targetQuestion.sourceQuestionId);
            if (bankQuestion && !bankQuestion.explanation) {
                bankQuestion.explanation = result.explanation;
                bankQuestion.translationVi = result.translationVi;
                await bankQuestion.save();
            }
        } catch {
            // Không ảnh hưởng flow chính nếu update bank fail
        }
    }

    ApiResponse.success(
        res,
        {
            explanation: result.explanation,
            translationVi: result.translationVi,
            source: "ai_generated",
        },
        "AI explanation generated and saved",
    );
});
