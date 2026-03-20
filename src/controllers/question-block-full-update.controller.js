import mongoose from "mongoose";
import QuestionBlock from "../models/question-block.model.js";
import Question from "../models/question.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

/**
 * Helper function to format block data with questions
 */
function toBlockShape(block, questions) {
    return {
        _id: block._id,
        section: block.section,
        level: block.level,
        questionType: block.questionType,
        title: block.title,
        difficulty: block.difficulty,
        tags: block.tags || [],
        instructions: block.instructions,
        context: block.context || null,
        isActive: block.isActive,
        createdBy: block.createdBy,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt,
        questions: questions.map((q) => ({
            _id: q._id,
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            translationVi: q.translationVi,
            difficulty: q.difficulty,
            media: q.media,
            orderInBlock: q.orderInBlock,
            createdBy: q.createdBy,
            createdAt: q.createdAt,
            updatedAt: q.updatedAt,
        })),
    };
}

/**
 * POST /question-blocks/update-full
 * Cập nhật toàn bộ block + tất cả questions
 *
 * Body: {
 *   blockId,
 *   section, level, questionType, title, difficulty, tags, instructions, context,
 *   questions: [{ _id?, questionText, options, correctAnswer, explanation, ... }]
 * }
 */
export const updateFullBlock = asyncHandler(async (req, res) => {
    const { blockId, questions: questionsData, ...blockData } = req.body;

    if (!blockId) {
        return ApiResponse.error(res, "Block ID is required", 400);
    }

    if (!Array.isArray(questionsData) || questionsData.length === 0) {
        return ApiResponse.error(res, "Block must have at least 1 question", 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Verify block exists and user has permission
        const existingBlock = await QuestionBlock.findById(blockId);
        if (!existingBlock) {
            return ApiResponse.error(res, "Question block not found", 404);
        }

        if (req.user.role === "teacher" && existingBlock.createdBy.toString() !== req.user.id) {
            return ApiResponse.error(res, "Not authorized to update this block", 403);
        }

        // 2. Update block metadata
        const updatedBlock = await QuestionBlock.findByIdAndUpdate(
            blockId,
            {
                ...blockData,
                updatedAt: new Date(),
            },
            {
                new: true,
                runValidators: true,
                session,
            },
        );

        // 3. Get existing questions
        const existingQuestions = await Question.find({ block: blockId }).session(session);
        const existingQuestionIds = new Set(existingQuestions.map((q) => q._id.toString()));

        // 4. Process incoming questions
        const newQuestions = [];
        const updatePromises = [];
        const incomingQuestionIds = new Set();

        for (let i = 0; i < questionsData.length; i++) {
            const questionData = {
                ...questionsData[i],
                orderInBlock: i + 1,
                block: blockId,
            };

            if (questionData._id) {
                // Update existing question
                incomingQuestionIds.add(questionData._id.toString());
                const { _id, ...updateData } = questionData;
                updatePromises.push(
                    Question.findByIdAndUpdate(
                        _id,
                        { ...updateData, updatedAt: new Date() },
                        { new: true, runValidators: true, session },
                    ),
                );
            } else {
                // Create new question
                newQuestions.push({
                    ...questionData,
                    createdBy: req.user.id,
                });
            }
        }

        // 5. Delete questions that are no longer in the list
        const questionsToDelete = Array.from(existingQuestionIds).filter(
            (id) => !incomingQuestionIds.has(id),
        );
        if (questionsToDelete.length > 0) {
            await Question.deleteMany({ _id: { $in: questionsToDelete } }, { session });
        }

        // 6. Execute updates and creates
        const updatedQuestions = await Promise.all(updatePromises);
        const createdQuestions =
            newQuestions.length > 0 ? await Question.insertMany(newQuestions, { session }) : [];

        await session.commitTransaction();

        // 7. Get final question list
        const finalQuestions = await Question.find({ block: blockId })
            .sort({ orderInBlock: 1 })
            .populate("createdBy", "fullName email");

        ApiResponse.success(
            res,
            { block: toBlockShape(updatedBlock, finalQuestions) },
            "Block and questions updated successfully",
        );
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
});
