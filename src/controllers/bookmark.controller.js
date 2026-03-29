import bookmarkRepository from "../repositories/bookmark.repository.js";
import { examRepository } from "../repositories/index.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

export const toggleBookmark = asyncHandler(async (req, res) => {
    const { examId, questionId, sectionType } = req.body;
    const result = await bookmarkRepository.toggle(req.user.id, examId, questionId, sectionType);
    ApiResponse.success(res, result, result.bookmarked ? "Bookmarked" : "Bookmark removed");
});

export const getMyBookmarks = asyncHandler(async (req, res) => {
    const { page, limit, sectionType } = req.body;
    const { data, total, page: p, limit: l } = await bookmarkRepository.getUserBookmarks(
        req.user.id,
        { page, limit, sectionType },
    );

    // Enrich bookmarks with question data from exams
    const examIds = [...new Set(data.map((b) => b.examId.toString()))];
    const exams = await examRepository.find({ _id: { $in: examIds } }, { lean: true });
    const examMap = new Map(exams.map((e) => [e._id.toString(), e]));

    const enriched = data.map((bookmark) => {
        const bObj = bookmark.toObject ? bookmark.toObject() : { ...bookmark };
        const exam = examMap.get(bObj.examId.toString());
        if (!exam) return { ...bObj, question: null, examTitle: null, examLevel: null };

        let question = null;
        for (const section of exam.sections || []) {
            for (const block of section.blocks || []) {
                for (const q of block.questions || []) {
                    if (q._id.toString() === bObj.questionId.toString()) {
                        question = {
                            _id: q._id,
                            questionText: q.questionText,
                            options: q.options,
                            correctAnswer: q.correctAnswer,
                            explanation: q.explanation,
                            translationVi: q.translationVi,
                            media: q.media,
                        };
                        break;
                    }
                }
                if (question) break;
            }
            if (question) break;
        }

        return {
            ...bObj,
            question,
            examTitle: exam.title,
            examLevel: exam.level,
        };
    });

    ApiResponse.paginate(res, enriched, p, l, total, "Bookmarks retrieved");
});

export const checkBookmarks = asyncHandler(async (req, res) => {
    const { questionIds } = req.body;
    const bookmarkedSet = await bookmarkRepository.getBookmarkedIds(req.user.id, questionIds || []);
    ApiResponse.success(res, { bookmarkedIds: [...bookmarkedSet] });
});