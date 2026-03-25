import Question from "../models/question.model.js";
import BaseRepository from "./base.repository.js";

class QuestionRepository extends BaseRepository {
    constructor() {
        super(Question);
    }

    async findByBlock(blockId, options = {}) {
        return this.find(
            { block: blockId },
            {
                sort: { orderInBlock: 1 },
                ...options,
            },
        );
    }

    async findByBlocks(blockIds, options = {}) {
        return this.find(
            { block: { $in: blockIds } },
            {
                sort: { orderInBlock: 1 },
                ...options,
            },
        );
    }

    /**
     * Full-text search in questions, returns matching block IDs.
     */
    async searchBlockIds(search) {
        const matched = await this.model.find({ $text: { $search: search } }, { block: 1 }).lean();
        return [...new Set(matched.map((q) => q.block.toString()))];
    }

    async getLastOrder(blockId) {
        const last = await this.findOne(
            { block: blockId },
            {
                sort: { orderInBlock: -1 },
                lean: true,
            },
        );
        return last?.orderInBlock ?? 0;
    }

    async deleteByBlock(blockId, options = {}) {
        return this.deleteMany({ block: blockId }, options);
    }

    async incrementUsageCount(questionIds) {
        return this.model.updateMany({ _id: { $in: questionIds } }, { $inc: { usageCount: 1 } });
    }

    async getByIdWithBlock(questionId) {
        return this.findById(questionId, {
            populate: [
                { path: "block", select: "title section level context" },
                { path: "createdBy", select: "fullName email" },
            ],
        });
    }
}

export default new QuestionRepository();
