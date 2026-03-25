import mongoose from "mongoose";
import { questionBlockRepository, questionRepository } from "../repositories/index.js";
import { AuthorizationError, BadRequestError, NotFoundError } from "../utils/errors.js";

class QuestionBlockService {
    /**
     * Create multiple blocks with questions in a single transaction.
     */
    async createBlocks(items, userId) {
        if (!Array.isArray(items) || items.length === 0) {
            throw new BadRequestError("items must be a non-empty array");
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const results = [];

            for (const item of items) {
                const { questions: questionsData, ...blockData } = item;

                if (!blockData.section || !blockData.level) {
                    throw new BadRequestError("Block missing required fields: section, level");
                }
                if (!Array.isArray(questionsData) || questionsData.length === 0) {
                    throw new BadRequestError("Each block must have at least 1 question");
                }

                const block = await questionBlockRepository.create(
                    { ...blockData, createdBy: userId },
                    { session },
                );

                const questionDocs = questionsData.map((q, i) => ({
                    ...q,
                    block: block._id,
                    orderInBlock: q.orderInBlock ?? i + 1,
                    createdBy: userId,
                }));

                const questions = await questionRepository.insertMany(questionDocs, { session });
                results.push(this._toBlockShape(block, questions));
            }

            await session.commitTransaction();

            return {
                blocks: results,
                summary: {
                    blockCount: results.length,
                    totalQuestions: results.reduce((sum, b) => sum + b.questions.length, 0),
                },
            };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    /**
     * List blocks with search, filters, and pagination.
     */
    async getBlocks(filters) {
        const { search, ...rest } = filters;
        let blockIds;

        if (search) {
            const [fromBlocks, fromQuestions] = await Promise.all([
                questionBlockRepository.searchBlockIds(search, this._buildBaseFilter(rest)),
                questionRepository.searchBlockIds(search),
            ]);
            blockIds = [...new Set([...fromBlocks, ...fromQuestions])];

            if (blockIds.length === 0) {
                return { data: [], total: 0, page: rest.page || 1, limit: rest.limit || 20 };
            }
        }

        const {
            data: blocks,
            total,
            page,
            limit,
        } = await questionBlockRepository.searchBlocks({
            ...rest,
            blockIds,
        });

        // Attach questions
        const allBlockIds = blocks.map((b) => b._id);
        const allQuestions = await questionRepository.findByBlocks(allBlockIds, { lean: true });

        const questionsByBlock = {};
        for (const q of allQuestions) {
            const key = q.block.toString();
            (questionsByBlock[key] ??= []).push(q);
        }

        const results = blocks.map((b) => ({
            ...b,
            context: b.context || null,
            questions: questionsByBlock[b._id.toString()] || [],
        }));

        return { data: results, total, page, limit };
    }

    async getBlockById(blockId) {
        const block = await questionBlockRepository.getByIdWithCreator(blockId);
        if (!block) throw new NotFoundError("Question block");

        const questions = await questionRepository.findByBlock(blockId, {
            populate: { path: "createdBy", select: "fullName email" },
        });

        return this._toBlockShape(block, questions);
    }

    async updateBlock(blockId, updateData, user) {
        const block = await questionBlockRepository.findById(blockId);
        if (!block) throw new NotFoundError("Question block");

        this._checkOwnership(block, user);

        const updated = await questionBlockRepository.updateById(blockId, updateData);
        const questions = await questionRepository.findByBlock(blockId);

        return this._toBlockShape(updated, questions);
    }

    /**
     * Full update: block metadata + all questions (add/edit/delete).
     */
    async updateFullBlock(blockId, blockData, questionsData, user) {
        if (!Array.isArray(questionsData) || questionsData.length === 0) {
            throw new BadRequestError("Block must have at least 1 question");
        }

        const existing = await questionBlockRepository.findById(blockId);
        if (!existing) throw new NotFoundError("Question block");
        this._checkOwnership(existing, user);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Update block
            const updatedBlock = await questionBlockRepository.updateById(blockId, blockData, {
                session,
            });

            // Process questions
            const existingQuestions = await questionRepository.findByBlock(blockId, { session });
            const existingIds = new Set(existingQuestions.map((q) => q._id.toString()));
            const incomingIds = new Set();
            const newQuestions = [];
            const updatePromises = [];

            for (let i = 0; i < questionsData.length; i++) {
                const qData = { ...questionsData[i], orderInBlock: i + 1, block: blockId };

                if (qData._id) {
                    incomingIds.add(qData._id.toString());
                    const { _id, ...update } = qData;
                    updatePromises.push(questionRepository.updateById(_id, update, { session }));
                } else {
                    newQuestions.push({ ...qData, createdBy: user.id });
                }
            }

            // Delete removed questions
            const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
            if (toDelete.length > 0) {
                await questionRepository.deleteMany({ _id: { $in: toDelete } }, { session });
            }

            await Promise.all(updatePromises);
            if (newQuestions.length > 0) {
                await questionRepository.insertMany(newQuestions, { session });
            }

            await session.commitTransaction();

            const finalQuestions = await questionRepository.findByBlock(blockId, {
                populate: { path: "createdBy", select: "fullName email" },
            });

            return this._toBlockShape(updatedBlock, finalQuestions);
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    async deleteBlock(blockId, user) {
        const block = await questionBlockRepository.findById(blockId);
        if (!block) throw new NotFoundError("Question block");
        this._checkOwnership(block, user);

        await questionRepository.deleteByBlock(blockId);
        await questionBlockRepository.deleteById(blockId);
    }

    // --- Question operations within a block ---

    async addQuestionsToBlock(blockId, questionsData, userId) {
        const block = await questionBlockRepository.findById(blockId);
        if (!block) throw new NotFoundError("Question block");

        const startOrder = (await questionRepository.getLastOrder(blockId)) + 1;

        const docs = questionsData.map((q, i) => ({
            ...q,
            block: blockId,
            orderInBlock: q.orderInBlock ?? startOrder + i,
            createdBy: userId,
        }));

        const created = await questionRepository.insertMany(docs);
        return { questions: created, count: created.length };
    }

    async getQuestionById(questionId) {
        const question = await questionRepository.getByIdWithBlock(questionId);
        if (!question) throw new NotFoundError("Question");
        return question;
    }

    async updateQuestion(questionId, updateData, user) {
        const question = await questionRepository.findById(questionId);
        if (!question) throw new NotFoundError("Question");
        this._checkOwnership(question, user);

        return questionRepository.updateById(questionId, updateData);
    }

    async deleteQuestion(questionId, user) {
        const question = await questionRepository.findById(questionId);
        if (!question) throw new NotFoundError("Question");
        this._checkOwnership(question, user);

        await questionRepository.deleteById(questionId);
    }

    // --- Helpers ---

    _checkOwnership(resource, user) {
        if (user.role === "creator" && resource.createdBy.toString() !== user.id) {
            throw new AuthorizationError("Not authorized to modify this resource");
        }
    }

    _buildBaseFilter({ section, level, difficulty, isActive, createdBy }) {
        const f = {};
        if (section) f.section = section;
        if (level) f.level = level;
        if (difficulty) f.difficulty = difficulty;
        if (isActive !== undefined) f.isActive = isActive;
        if (createdBy) f.createdBy = createdBy;
        return f;
    }

    _toBlockShape(block, questions) {
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
            tags: obj.tags || [],
            isActive: obj.isActive,
            createdBy: obj.createdBy,
            createdAt: obj.createdAt,
            updatedAt: obj.updatedAt,
            questions: (questions || []).map((q) => {
                const qObj = q.toObject ? q.toObject() : q;
                return {
                    _id: qObj._id,
                    questionText: qObj.questionText,
                    options: qObj.options,
                    correctAnswer: qObj.correctAnswer,
                    explanation: qObj.explanation,
                    translationVi: qObj.translationVi,
                    difficulty: qObj.difficulty,
                    media: qObj.media,
                    orderInBlock: qObj.orderInBlock,
                    tags: qObj.tags,
                    createdBy: qObj.createdBy,
                    createdAt: qObj.createdAt,
                    updatedAt: qObj.updatedAt,
                };
            }),
        };
    }
}

export default new QuestionBlockService();
