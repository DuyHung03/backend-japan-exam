import {
    examRepository,
    questionBlockRepository,
    questionRepository,
} from "../repositories/index.js";
import { AuthorizationError, BadRequestError, NotFoundError } from "../utils/errors.js";
import { generateExamCode } from "../utils/helpers.js";

class ExamService {
    async createExam({ title, level, sections, ...rest }, userId) {
        const examCode = generateExamCode(level, title);
        let totalQuestions = 0;
        let totalPoints = 0;
        const processedSections = [];

        for (const section of sections) {
            const {
                blocks: processedBlocks,
                questionCount,
                points,
            } = await this._processSectionBlocks(section.blocks || []);

            processedSections.push({
                sectionType: section.sectionType,
                sectionName: section.sectionName,
                duration: section.duration,
                order: section.order,
                questionCount,
                points,
                passingScore: section.passingScore || 0,
                blocks: processedBlocks,
            });

            totalQuestions += questionCount;
            totalPoints += points;
        }

        const exam = await examRepository.create({
            examCode,
            title,
            level,
            sections: processedSections,
            totalQuestions,
            totalPoints,
            createdBy: userId,
            ...rest,
        });

        return exam;
    }

    async getExams(filters) {
        return examRepository.searchExams(filters);
    }

    async getPublicExams(filters) {
        return examRepository.listPublicExams(filters);
    }

    async getExamById(examId, user) {
        const exam = await examRepository.getByIdWithCreator(examId);
        if (!exam) throw new NotFoundError("Exam");

        if (user?.role === "user" && (exam.status !== "published" || !exam.isPublic)) {
            throw new AuthorizationError("Not authorized to view this exam");
        }

        await examRepository.incrementViewCount(examId);

        // Recalculate total questions
        let computedTotal = 0;
        (exam.sections || []).forEach((s) =>
            (s.blocks || []).forEach((b) => {
                computedTotal += b.questions?.length || 0;
            }),
        );
        exam.totalQuestions = computedTotal;

        return exam;
    }

    async updateExam(examId, updateData, user) {
        const exam = await examRepository.findById(examId);
        if (!exam) throw new NotFoundError("Exam");
        this._checkOwnership(exam, user);

        // Auto-publish when making public, revert to draft when making private
        if (updateData.isPublic === true && exam.status === "draft") {
            updateData.status = "published";
        } else if (updateData.isPublic === false && exam.status === "published") {
            updateData.status = "draft";
        }

        return examRepository.updateById(examId, updateData);
    }

    async addBlockToExam(examId, sectionIndex, blockInput, user) {
        const exam = await examRepository.findById(examId);
        if (!exam) throw new NotFoundError("Exam");
        this._checkOwnership(exam, user);

        if (!exam.sections[sectionIndex]) {
            throw new NotFoundError("Section");
        }

        const processedBlock = await this._processBlockInput(
            blockInput,
            exam.sections[sectionIndex].blocks?.length || 0,
        );
        exam.sections[sectionIndex].blocks.push(processedBlock);

        // Recalculate
        const addedCount = processedBlock.questions.length;
        const addedPoints = processedBlock.questions.reduce((s, q) => s + (q.points || 1), 0);

        exam.sections[sectionIndex].questionCount =
            (exam.sections[sectionIndex].questionCount || 0) + addedCount;
        exam.sections[sectionIndex].points =
            (exam.sections[sectionIndex].points || 0) + addedPoints;
        exam.totalQuestions = (exam.totalQuestions || 0) + addedCount;
        exam.totalPoints = (exam.totalPoints || 0) + addedPoints;

        await exam.save();
        return exam;
    }

    async removeBlockFromExam(examId, sectionIndex, blockIndex, user) {
        const exam = await examRepository.findById(examId);
        if (!exam) throw new NotFoundError("Exam");
        this._checkOwnership(exam, user);

        if (!exam.sections[sectionIndex]?.blocks?.[blockIndex]) {
            throw new NotFoundError("Block");
        }

        const removed = exam.sections[sectionIndex].blocks[blockIndex];
        const removedCount = removed.questions?.length || 0;
        const removedPoints = removed.questions?.reduce((s, q) => s + (q.points || 1), 0) || 0;

        exam.sections[sectionIndex].blocks.splice(blockIndex, 1);
        exam.sections[sectionIndex].questionCount = Math.max(
            0,
            (exam.sections[sectionIndex].questionCount || 0) - removedCount,
        );
        exam.sections[sectionIndex].points = Math.max(
            0,
            (exam.sections[sectionIndex].points || 0) - removedPoints,
        );
        exam.totalQuestions = Math.max(0, (exam.totalQuestions || 0) - removedCount);
        exam.totalPoints = Math.max(0, (exam.totalPoints || 0) - removedPoints);

        await exam.save();
        return exam;
    }

    async updateExamQuestion(examId, sectionIndex, blockIndex, questionIndex, questionData, user) {
        const exam = await examRepository.findById(examId);
        if (!exam) throw new NotFoundError("Exam");
        this._checkOwnership(exam, user);

        const question =
            exam.sections?.[sectionIndex]?.blocks?.[blockIndex]?.questions?.[questionIndex];
        if (!question) throw new NotFoundError("Question");

        const fields = [
            "questionText",
            "options",
            "correctAnswer",
            "explanation",
            "translationVi",
            "media",
            "points",
        ];
        for (const field of fields) {
            if (questionData[field] !== undefined) question[field] = questionData[field];
        }

        await exam.save();
        return exam;
    }

    async removeQuestionFromExam(examId, sectionIndex, blockIndex, questionIndex, user) {
        const exam = await examRepository.findById(examId);
        if (!exam) throw new NotFoundError("Exam");
        this._checkOwnership(exam, user);

        const block = exam.sections?.[sectionIndex]?.blocks?.[blockIndex];
        if (!block?.questions?.[questionIndex]) throw new NotFoundError("Question");

        const removedPoints = block.questions[questionIndex].points || 1;
        block.questions.splice(questionIndex, 1);

        exam.sections[sectionIndex].questionCount = Math.max(
            0,
            (exam.sections[sectionIndex].questionCount || 0) - 1,
        );
        exam.sections[sectionIndex].points = Math.max(
            0,
            (exam.sections[sectionIndex].points || 0) - removedPoints,
        );
        exam.totalQuestions = Math.max(0, (exam.totalQuestions || 0) - 1);
        exam.totalPoints = Math.max(0, (exam.totalPoints || 0) - removedPoints);

        // Remove empty block
        if (block.questions.length === 0) {
            exam.sections[sectionIndex].blocks.splice(blockIndex, 1);
        }

        await exam.save();
        return exam;
    }

    async deleteExam(examId, user) {
        const exam = await examRepository.findById(examId);
        if (!exam) throw new NotFoundError("Exam");
        this._checkOwnership(exam, user);

        if (exam.attemptCount > 0 && user.role !== "admin") {
            throw new BadRequestError("Cannot delete exam with attempts");
        }

        await examRepository.deleteById(examId);
    }

    async publishExam(examId, user) {
        const exam = await examRepository.findById(examId);
        if (!exam) throw new NotFoundError("Exam");
        this._checkOwnership(exam, user);

        if (exam.totalQuestions === 0) {
            throw new BadRequestError("Cannot publish exam with no questions");
        }

        exam.status = "published";
        exam.isPublic = true;
        exam.publishedAt = new Date();
        await exam.save();
        return exam;
    }

    // --- Private helpers ---

    _checkOwnership(exam, user) {
        if (user.role === "creator" && exam.createdBy.toString() !== user.id) {
            throw new AuthorizationError("Not authorized to modify this exam");
        }
    }

    async _processSectionBlocks(blocks) {
        let questionCount = 0;
        let points = 0;
        const processedBlocks = [];

        for (const blockInput of blocks) {
            const processed = await this._processBlockInput(blockInput, processedBlocks.length);
            processedBlocks.push(processed);
            questionCount += processed.questions.length;
            points += processed.questions.reduce((s, q) => s + (q.points || 1), 0);
        }

        return { blocks: processedBlocks, questionCount, points };
    }

    async _processBlockInput(input, order = 0) {
        const block = {
            title: input.title || null,
            instruction: input.instruction || null,
            questionType: input.questionType || null,
            order: input.order || order + 1,
            context: input.context || null,
            questions: [],
        };

        if (input.blockId) {
            // Copy entire block from bank
            const bankBlock = await questionBlockRepository.findById(input.blockId);
            if (!bankBlock) throw new NotFoundError("Question block");

            const bankQuestions = await questionRepository.findByBlock(input.blockId);

            block.sourceBlockId = bankBlock._id;
            block.title = block.title || bankBlock.title;
            block.context = bankBlock.context || null;
            block.instruction = block.instruction || bankBlock.instructions;

            block.questions = bankQuestions.map((q, idx) => ({
                sourceQuestionId: q._id,
                questionText: q.questionText,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                translationVi: q.translationVi,
                media: q.media,
                points: input.pointsPerQuestion || 1,
                order: idx + 1,
            }));

            await questionRepository.incrementUsageCount(bankQuestions.map((q) => q._id));
        } else if (Array.isArray(input.questionIds) && input.questionIds.length > 0) {
            // Cherry-pick individual questions
            const questions = await questionRepository.find({ _id: { $in: input.questionIds } });

            block.questions = questions.map((q, idx) => ({
                sourceQuestionId: q._id,
                questionText: q.questionText,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                translationVi: q.translationVi,
                media: q.media,
                points: input.pointsPerQuestion || 1,
                order: idx + 1,
            }));

            await questionRepository.incrementUsageCount(input.questionIds);
        } else if (Array.isArray(input.questions) && input.questions.length > 0) {
            // Inline manual questions
            block.questions = input.questions.map((q, idx) => ({
                questionText: q.questionText,
                options: Array.isArray(q.options)
                    ? q.options
                    : ["A", "B", "C", "D"]
                          .filter((l) => q[`option${l}`] != null)
                          .map((l) => ({ label: l, text: q[`option${l}`] })),
                correctAnswer: q.correctAnswer,
                explanation: q.explanation || "",
                translationVi: q.translationVi || "",
                media: q.media || {},
                points: q.points || input.pointsPerQuestion || 1,
                order: q.order || idx + 1,
            }));
        }

        return block;
    }
}

export default new ExamService();
