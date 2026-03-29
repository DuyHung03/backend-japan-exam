import Bookmark from "../models/bookmark.model.js";
import BaseRepository from "./base.repository.js";

class BookmarkRepository extends BaseRepository {
    constructor() {
        super(Bookmark);
    }

    async toggle(userId, examId, questionId, sectionType) {
        const existing = await this.findOne({ user: userId, examId, questionId });
        if (existing) {
            await existing.deleteOne();
            return { bookmarked: false };
        }
        await this.create({ user: userId, examId, questionId, sectionType });
        return { bookmarked: true };
    }

    async getUserBookmarks(userId, { page = 1, limit = 20, sectionType }) {
        const filter = { user: userId };
        if (sectionType) filter.sectionType = sectionType;
        return this.paginate(filter, {
            page,
            limit,
            sort: { createdAt: -1 },
        });
    }

    async isBookmarked(userId, questionId) {
        const doc = await this.findOne({ user: userId, questionId });
        return !!doc;
    }

    async getBookmarkedIds(userId, questionIds) {
        const docs = await this.find({ user: userId, questionId: { $in: questionIds } }, { select: "questionId", lean: true });
        return new Set(docs.map((d) => d.questionId.toString()));
    }
}

export default new BookmarkRepository();