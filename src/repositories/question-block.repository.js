import mongoose from "mongoose";
import QuestionBlock from "../models/question-block.model.js";
import BaseRepository from "./base.repository.js";

class QuestionBlockRepository extends BaseRepository {
    constructor() {
        super(QuestionBlock);
    }

    /**
     * Full-text search across blocks, returns matching block IDs.
     */
    async searchBlockIds(search, baseFilter = {}) {
        const matchedBlocks = await this.model
            .find({ ...baseFilter, $text: { $search: search } }, { score: { $meta: "textScore" } })
            .lean();
        return matchedBlocks.map((b) => b._id.toString());
    }

    /**
     * Search blocks with filter, pagination, and optional text search block IDs.
     */
    async searchBlocks({
        page = 1,
        limit = 20,
        section,
        level,
        difficulty,
        isActive,
        createdBy,
        createdAfter,
        createdBefore,
        blockIds,
        sort,
    }) {
        const filter = {};

        if (section) filter.section = section;
        if (level) filter.level = level;
        if (difficulty) filter.difficulty = difficulty;
        if (isActive !== undefined) filter.isActive = isActive;
        if (createdBy) filter.createdBy = createdBy;

        if (createdAfter || createdBefore) {
            filter.createdAt = {};
            if (createdAfter) filter.createdAt.$gte = new Date(createdAfter);
            if (createdBefore) filter.createdAt.$lte = new Date(createdBefore);
        }

        if (blockIds) {
            filter._id = { $in: blockIds.map((id) => new mongoose.Types.ObjectId(id)) };
        }

        const SORT_MAP = {
            newest: { createdAt: -1 },
            oldest: { createdAt: 1 },
        };
        const resolvedSort = SORT_MAP[sort] || { createdAt: -1 };

        return this.paginate(filter, {
            page,
            limit,
            sort: resolvedSort,
            populate: { path: "createdBy", select: "fullName email" },
        });
    }

    async getByIdWithCreator(blockId) {
        return this.findById(blockId, {
            populate: { path: "createdBy", select: "fullName email" },
        });
    }

    async countBySection() {
        return this.aggregate([{ $group: { _id: "$section", count: { $sum: 1 } } }]);
    }
}

export default new QuestionBlockRepository();
