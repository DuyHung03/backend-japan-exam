import mongoose from "mongoose";
import QuestionBlock from "../models/question-block.model.js";
import Question from "../models/question.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

// ============================================================
// Helper: lắp ráp block + questions thành shape QuestionBlock
// ============================================================
function toBlockShape(block, questions) {
    const obj = block.toObject ? block.toObject() : block;
    return {
        _id: obj._id,
        title: obj.title,
        section: obj.section,
        level: obj.level,
        questionType: obj.questionType,
        context: obj.context || null,
        instructions: obj.instructions,
        difficulty: obj.difficulty,
        tags: obj.tags,
        isActive: obj.isActive,
        createdBy: obj.createdBy,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
        questions,
    };
}

// ============================================================
// CREATE — Tạo blocks (standalone + group) trong 1 lần gọi
// ============================================================

/**
 * POST /question-blocks/create
 *
 * Body: { items: [ ...QuestionBlockInput ] }
 *
 * Mỗi item:
 * {
 *   // Block metadata
 *   section, level, questionType?, title?, difficulty?, tags?, instructions?,
 *
 *   // Context (optional — nếu có → group block, không → standalone)
 *   context?: { text?, audioUrl?, audioScript?, imageUrl? },
 *
 *   // Danh sách câu hỏi — luôn là mảng
 *   questions: [
 *     { questionText, options, correctAnswer, explanation?, translationVi?, media?, orderInBlock? }
 *   ]
 * }
 *
 * Transaction: 1 item lỗi → rollback tất cả.
 */
export const createBlocks = asyncHandler(async (req, res) => {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return ApiResponse.error(res, "items must be a non-empty array", 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const results = [];

        for (const item of items) {
            const { questions: questionsData, ...blockData } = item;

            // Validate required fields
            if (!blockData.section || !blockData.level) {
                throw new Error("Block missing required fields: section, level");
            }
            if (!Array.isArray(questionsData) || questionsData.length === 0) {
                throw new Error("Each block must have at least 1 question");
            }

            // Tạo block
            const [block] = await QuestionBlock.create([{ ...blockData, createdBy: req.user.id }], {
                session,
            });

            // Tạo questions
            const questionDocs = questionsData.map((q, index) => ({
                ...q,
                block: block._id,
                orderInBlock: q.orderInBlock ?? index + 1,
                createdBy: req.user.id,
            }));

            const questions = await Question.insertMany(questionDocs, { session });

            results.push(toBlockShape(block, questions));
        }

        await session.commitTransaction();

        const totalQuestions = results.reduce((sum, b) => sum + b.questions.length, 0);

        ApiResponse.created(
            res,
            {
                blocks: results,
                summary: {
                    blockCount: results.length,
                    totalQuestions,
                },
            },
            "Question blocks created successfully",
        );
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
});

// ============================================================
// LIST — Danh sách blocks (có search & pagination)
// ============================================================

/**
 * POST /question-blocks/list
 *
 * Filters:
 *   - section, level, difficulty, isActive: exact match
 *   - search: full-text search EVERYWHERE (blocks + questions content)
 *       Tìm trong: title, questionType, context, instructions, tags, questionText, explanation
 *   - createdBy: filter theo user
 *   - createdAfter, createdBefore: date range filter
 *   - page, limit: pagination
 *
 * Example:
 * {
 *   page: 1,
 *   limit: 20,
 *   section: "reading",
 *   level: "N4",
 *   search: "đoạn văn",                    // Search everywhere (blocks + questions)
 *   createdBy: "user_id",
 *   createdAfter: "2026-01-01",
 *   createdBefore: "2026-03-01"
 * }
 */
export const getBlocks = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        section,
        level,
        difficulty,
        isActive,
        search,
        createdBy,
        createdAfter,
        createdBefore,
    } = req.body;

    const blockQuery = {};

    // Filters cho blocks
    if (section) blockQuery.section = section;
    if (level) blockQuery.level = level;
    if (difficulty) blockQuery.difficulty = difficulty;
    if (isActive !== undefined) blockQuery.isActive = isActive;
    if (createdBy) blockQuery.createdBy = createdBy;

    // Date range filter
    if (createdAfter || createdBefore) {
        blockQuery.createdAt = {};
        if (createdAfter) blockQuery.createdAt.$gte = new Date(createdAfter);
        if (createdBefore) blockQuery.createdAt.$lte = new Date(createdBefore);
    }

    // Smart search: tìm trong cả blocks và questions
    let blockIdsToFetch;
    if (search) {
        // 1. Tìm blocks match
        const matchedBlocks = await QuestionBlock.find(
            {
                ...blockQuery,
                $text: { $search: search },
            },
            { score: { $meta: "textScore" } },
        ).lean();

        const blockIdsFromBlocks = matchedBlocks.map((b) => b._id.toString());

        // 2. Tìm questions match + lấy block IDs
        const matchedQuestions = await Question.find(
            { $text: { $search: search } },
            { block: 1 },
        ).lean();
        const blockIdsFromQuestions = [...new Set(matchedQuestions.map((q) => q.block.toString()))];

        // 3. Merge + deduplicate
        blockIdsToFetch = [...new Set([...blockIdsFromBlocks, ...blockIdsFromQuestions])];

        if (blockIdsToFetch.length === 0) {
            return ApiResponse.paginate(
                res,
                [],
                page,
                limit,
                0,
                "Question blocks retrieved successfully",
            );
        }

        blockQuery._id = {
            $in: blockIdsToFetch.map((id) => new mongoose.Types.ObjectId(id)),
        };
    }

    // Count & fetch blocks
    const total = await QuestionBlock.countDocuments(blockQuery);
    const blocks = await QuestionBlock.find(blockQuery)
        .populate("createdBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

    // Attach questions cho từng block
    const blockIds = blocks.map((b) => b._id);
    const allQuestions = await Question.find({ block: { $in: blockIds } })
        .sort({ orderInBlock: 1 })
        .lean();

    const questionsByBlock = {};
    for (const q of allQuestions) {
        const key = q.block.toString();
        if (!questionsByBlock[key]) questionsByBlock[key] = [];
        questionsByBlock[key].push(q);
    }

    const results = blocks.map((b) => ({
        ...b,
        context: b.context || null,
        questions: questionsByBlock[b._id.toString()] || [],
    }));

    ApiResponse.paginate(
        res,
        results,
        page,
        limit,
        total,
        "Question blocks retrieved successfully",
    );
});

// ============================================================
// GET BY ID — Chi tiết block (kèm câu hỏi)
// ============================================================

/**
 * POST /question-blocks/get-by-id
 * Body: { blockId }
 */
export const getBlockById = asyncHandler(async (req, res) => {
    const { blockId } = req.body;

    const block = await QuestionBlock.findById(blockId).populate("createdBy", "fullName email");

    if (!block) {
        return ApiResponse.error(res, "Question block not found", 404);
    }

    const questions = await Question.find({ block: blockId })
        .sort({ orderInBlock: 1 })
        .populate("createdBy", "fullName email");

    ApiResponse.success(res, { block: toBlockShape(block, questions) });
});

// ============================================================
// UPDATE — Cập nhật block metadata (không động đến questions)
// ============================================================

/**
 * POST /question-blocks/update
 * Body: { blockId, ...updateData }
 */
export const updateBlock = asyncHandler(async (req, res) => {
    const { blockId, ...updateData } = req.body;

    const block = await QuestionBlock.findById(blockId);
    if (!block) {
        return ApiResponse.error(res, "Question block not found", 404);
    }

    if (req.user.role === "teacher" && block.createdBy.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized to update this block", 403);
    }

    const updated = await QuestionBlock.findByIdAndUpdate(blockId, updateData, {
        new: true,
        runValidators: true,
    });

    const questions = await Question.find({ block: blockId }).sort({ orderInBlock: 1 });

    ApiResponse.success(
        res,
        { block: toBlockShape(updated, questions) },
        "Question block updated successfully",
    );
});

// ============================================================
// DELETE — Xóa block + tất cả câu hỏi thuộc block
// ============================================================

/**
 * POST /question-blocks/delete
 * Body: { blockId }
 */
export const deleteBlock = asyncHandler(async (req, res) => {
    const { blockId } = req.body;

    const block = await QuestionBlock.findById(blockId);
    if (!block) {
        return ApiResponse.error(res, "Question block not found", 404);
    }

    if (req.user.role === "teacher" && block.createdBy.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized to delete this block", 403);
    }

    await Question.deleteMany({ block: blockId });
    await block.deleteOne();

    ApiResponse.success(res, null, "Question block and its questions deleted successfully");
});
