import { examAttemptRepository, examRepository } from "../repositories/index.js";
import { AuthorizationError, BadRequestError, NotFoundError } from "../utils/errors.js";
import { calculateGrade } from "../utils/helpers.js";

const GRACE_PERIOD_SECONDS = 30;

class ExamAttemptService {
    /**
     * Start or resume an exam attempt.
     * If userId is null (guest), return exam data without DB persistence.
     */
    async startExam({ examId, mode = "full_test", practiceSections, practiceMinutes }, userId) {
        const exam = await examRepository.findById(examId);
        if (!exam) throw new NotFoundError("Exam");

        // ── Guest mode: return exam data without creating an attempt ──
        if (!userId) {
            const allowedDuration =
                mode === "practice" && practiceMinutes > 0 ? practiceMinutes : exam.duration;

            const filteredSections =
                mode === "practice" &&
                Array.isArray(practiceSections) &&
                practiceSections.length > 0
                    ? practiceSections
                    : null;

            const strippedExam = this._stripAnswers(exam);
            if (filteredSections && strippedExam.sections) {
                strippedExam.sections = strippedExam.sections.filter((s) =>
                    filteredSections.includes(s.sectionType),
                );
            }

            return {
                attempt: {
                    _id: null,
                    mode,
                    allowedDuration,
                    startTime: new Date(),
                    status: "in_progress",
                    guest: true,
                },
                exam: strippedExam,
                serverTime: Date.now(),
                remainingSeconds: allowedDuration * 60,
                resumed: false,
            };
        }

        // ── Authenticated mode ──
        // Check resume for full_test
        if (mode === "full_test") {
            const existing = await examAttemptRepository.findInProgress(userId, examId);

            if (existing) {
                const elapsed = (Date.now() - existing.startTime.getTime()) / 1000;
                const allowedSeconds = (existing.allowedDuration || exam.duration) * 60;

                if (elapsed >= allowedSeconds) {
                    existing.status = "submitted";
                    existing.endTime = new Date();
                    existing.submitTime = new Date();
                    existing.duration = Math.floor(elapsed);
                    await existing.save();
                } else {
                    return {
                        attempt: existing,
                        exam: this._stripAnswers(exam),
                        serverTime: Date.now(),
                        remainingSeconds: Math.max(0, Math.floor(allowedSeconds - elapsed)),
                        resumed: true,
                    };
                }
            }
        }

        const allowedDuration =
            mode === "practice" && practiceMinutes > 0 ? practiceMinutes : exam.duration;

        const filteredSections =
            mode === "practice" && Array.isArray(practiceSections) && practiceSections.length > 0
                ? practiceSections
                : null;

        const attempt = await examAttemptRepository.create({
            user: userId,
            exam: examId,
            status: "in_progress",
            startTime: new Date(),
            mode,
            allowedDuration,
            filteredSections,
        });

        await examRepository.incrementAttemptCount(examId);

        const strippedExam = this._stripAnswers(exam);
        if (filteredSections && strippedExam.sections) {
            strippedExam.sections = strippedExam.sections.filter((s) =>
                filteredSections.includes(s.sectionType),
            );
        }

        return {
            attempt,
            exam: strippedExam,
            serverTime: Date.now(),
            remainingSeconds: allowedDuration * 60,
            resumed: false,
        };
    }

    /**
     * Submit exam with server-side grading.
     */
    async submitExam(attemptId, submittedAnswers, userId) {
        const attempt = await examAttemptRepository.findById(attemptId);
        if (!attempt) throw new NotFoundError("Attempt");

        if (attempt.user.toString() !== userId) {
            throw new AuthorizationError("Not authorized");
        }
        if (attempt.status !== "in_progress") {
            throw new BadRequestError("Exam already submitted");
        }

        const exam = await examRepository.findById(attempt.exam);
        if (!exam) throw new NotFoundError("Exam");

        // Time validation
        const elapsed = (Date.now() - attempt.startTime.getTime()) / 1000;
        const allowedSeconds = (attempt.allowedDuration || exam.duration) * 60;
        const isTimedOut = elapsed > allowedSeconds + GRACE_PERIOD_SECONDS;

        // Build question map
        const questionMap = this._buildQuestionMap(exam, attempt);

        // Grade answers
        const processedAnswers = this._gradeAnswers(submittedAnswers, questionMap, isTimedOut);
        const results = this._calculateResults(exam, attempt, processedAnswers);

        // Save
        attempt.answers = processedAnswers;
        attempt.status = "submitted";
        attempt.endTime = new Date();
        attempt.submitTime = new Date();
        attempt.duration = Math.floor(elapsed);
        attempt.results = results;
        await attempt.save();

        return { attempt, timedOut: isTimedOut };
    }

    /**
     * Evaluate practice mode (no DB persistence).
     */
    async evaluatePractice(examId, sectionTypes, submittedAnswers) {
        const exam = await examRepository.findById(examId);
        if (!exam) throw new NotFoundError("Exam");

        const filteredSections =
            Array.isArray(sectionTypes) && sectionTypes.length > 0
                ? exam.sections.filter((s) => sectionTypes.includes(s.sectionType))
                : exam.sections;

        const detailedResults = [];
        let totalCorrect = 0,
            totalWrong = 0,
            totalSkipped = 0;
        const sectionScores = [];

        for (const section of filteredSections) {
            let sectionCorrect = 0,
                sectionTotal = 0;

            for (const block of section.blocks) {
                for (const question of block.questions) {
                    sectionTotal++;
                    const submitted = (submittedAnswers || []).find(
                        (a) => a.questionId === question._id.toString(),
                    );
                    const selected = submitted?.selectedAnswer || null;
                    const isCorrect = selected === question.correctAnswer;

                    if (!selected) totalSkipped++;
                    else if (isCorrect) {
                        totalCorrect++;
                        sectionCorrect++;
                    } else totalWrong++;

                    detailedResults.push({
                        questionId: question._id,
                        questionText: question.questionText,
                        options: question.options,
                        correctAnswer: question.correctAnswer,
                        selectedAnswer: selected,
                        isCorrect: !!selected && isCorrect,
                        explanation: question.explanation,
                        translationVi: question.translationVi,
                        sectionType: section.sectionType,
                        points: question.points,
                    });
                }
            }

            const maxScore = section.points || sectionTotal;
            const score =
                sectionTotal > 0 ? Math.round((sectionCorrect / sectionTotal) * maxScore) : 0;

            sectionScores.push({
                sectionType: section.sectionType,
                sectionName: section.sectionName,
                correctAnswers: sectionCorrect,
                totalQuestions: sectionTotal,
                score,
                maxScore,
            });
        }

        const maxScore = sectionScores.reduce((s, sc) => s + sc.maxScore, 0);
        const totalScore = sectionScores.reduce((s, sc) => s + sc.score, 0);
        const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

        return {
            summary: {
                totalQuestions: totalCorrect + totalWrong + totalSkipped,
                correctAnswers: totalCorrect,
                wrongAnswers: totalWrong,
                skippedAnswers: totalSkipped,
                totalScore,
                maxScore,
                percentage,
                sectionScores,
            },
            detailedResults,
        };
    }

    async getExamInfo(examId, userRole) {
        const exam = await examRepository.getExamInfo(examId);
        if (!exam) throw new NotFoundError("Exam");

        if (userRole === "user" && (exam.status !== "published" || !exam.isPublic)) {
            throw new AuthorizationError("Exam not available");
        }

        // Compute real question counts per section
        const sectionSummaries = (exam.sections || []).map((s) => {
            const qCount = (s.blocks || []).reduce((t, b) => t + (b.questions?.length || 0), 0);
            return {
                sectionType: s.sectionType,
                sectionName: s.sectionName,
                duration: s.duration,
                questionCount: qCount,
                points: s.points,
                passingScore: s.passingScore,
            };
        });

        // Remove blocks from response
        const { sections, ...examData } = exam;
        return { ...examData, sections: sectionSummaries };
    }

    async getAttemptResult(attemptId, userId, userRole) {
        const attempt = await examAttemptRepository.getWithUser(attemptId);
        if (!attempt) throw new NotFoundError("Attempt");

        if (attempt.user._id.toString() !== userId && userRole !== "admin") {
            throw new AuthorizationError("Not authorized");
        }
        if (attempt.status !== "submitted") {
            throw new BadRequestError("Exam not yet submitted");
        }

        const exam = await examRepository.findById(attempt.exam, { lean: true });
        if (!exam) throw new NotFoundError("Exam");

        const detailedResults = this._buildDetailedResults(exam, attempt);

        return {
            attempt: {
                _id: attempt._id,
                mode: attempt.mode,
                startTime: attempt.startTime,
                endTime: attempt.endTime,
                duration: attempt.duration,
                results: attempt.results,
            },
            exam: {
                _id: exam._id,
                title: exam.title,
                level: exam.level,
                duration: exam.duration,
                totalQuestions: exam.totalQuestions,
                totalPoints: exam.totalPoints,
            },
            detailedResults,
        };
    }

    async getMyAttempts(userId, filters) {
        const { search, ...rest } = filters;

        let examIds;
        if (search) {
            const exams = await examRepository.find(
                {
                    $or: [
                        { title: { $regex: search, $options: "i" } },
                        { examCode: { $regex: search, $options: "i" } },
                    ],
                },
                { select: "_id", lean: true },
            );
            examIds = exams.map((e) => e._id);
        }

        return examAttemptRepository.getUserAttempts({ userId, ...rest, examIds });
    }

    async getAttemptById(attemptId, userId, userRole) {
        const attempt = await examAttemptRepository.getWithExamAndUser(attemptId);
        if (!attempt) throw new NotFoundError("Attempt");

        if (attempt.user._id.toString() !== userId && userRole !== "admin") {
            throw new AuthorizationError("Not authorized");
        }

        return attempt;
    }

    // --- Private helpers ---

    _stripAnswers(exam) {
        const obj = exam.toObject ? exam.toObject() : { ...exam };
        if (obj.sections) {
            obj.sections = obj.sections.map((section) => ({
                ...section,
                blocks: (section.blocks || []).map((block) => ({
                    ...block,
                    questions: (block.questions || []).map((q) => ({
                        _id: q._id,
                        questionText: q.questionText,
                        options: q.options,
                        media: q.media,
                        points: q.points,
                        order: q.order,
                    })),
                })),
            }));
        }
        return obj;
    }

    _buildQuestionMap(exam, attempt) {
        const map = new Map();
        const filteredSections =
            attempt.mode === "practice" && attempt.filteredSections?.length
                ? exam.sections.filter((s) => attempt.filteredSections.includes(s.sectionType))
                : exam.sections;

        for (const section of filteredSections) {
            for (const block of section.blocks) {
                for (const question of block.questions) {
                    map.set(question._id.toString(), {
                        question,
                        sectionType: section.sectionType,
                    });
                }
            }
        }
        return map;
    }

    _gradeAnswers(submittedAnswers, questionMap, isTimedOut) {
        if (!Array.isArray(submittedAnswers)) return [];

        return submittedAnswers
            .filter((a) => questionMap.has(a.questionId))
            .map((a) => {
                const { question, sectionType } = questionMap.get(a.questionId);
                return {
                    questionId: a.questionId,
                    sectionType,
                    selectedAnswer: isTimedOut ? null : a.selectedAnswer,
                    isCorrect: !isTimedOut && a.selectedAnswer === question.correctAnswer,
                };
            });
    }

    _calculateResults(exam, attempt, processedAnswers) {
        let totalCorrect = 0,
            totalWrong = 0,
            totalSkipped = 0;
        const sectionScores = [];

        const filteredSections =
            attempt.mode === "practice" && attempt.filteredSections?.length
                ? exam.sections.filter((s) => attempt.filteredSections.includes(s.sectionType))
                : exam.sections;

        for (const section of filteredSections) {
            let sectionCorrect = 0,
                sectionTotal = 0;
            const sectionMaxScore = section.points || 0;

            for (const block of section.blocks) {
                for (const question of block.questions) {
                    sectionTotal++;
                    const answer = processedAnswers.find(
                        (a) => a.questionId === question._id.toString(),
                    );
                    if (!answer || !answer.selectedAnswer) totalSkipped++;
                    else if (answer.isCorrect) {
                        totalCorrect++;
                        sectionCorrect++;
                    } else totalWrong++;
                }
            }

            const score =
                sectionTotal > 0
                    ? Math.round((sectionCorrect / sectionTotal) * sectionMaxScore)
                    : 0;

            sectionScores.push({
                sectionType: section.sectionType,
                sectionName: section.sectionName,
                correctAnswers: sectionCorrect,
                totalQuestions: sectionTotal,
                score,
                maxScore: sectionMaxScore,
                passed: score >= (section.passingScore || 0),
            });
        }

        const maxScore = sectionScores.reduce((s, sc) => s + sc.maxScore, 0) || exam.totalPoints;
        const totalScore = sectionScores.reduce((s, sc) => s + sc.score, 0);
        const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        const passed = totalScore >= exam.passingScore && sectionScores.every((s) => s.passed);

        return {
            totalQuestions: totalCorrect + totalWrong + totalSkipped,
            correctAnswers: totalCorrect,
            wrongAnswers: totalWrong,
            skippedAnswers: totalSkipped,
            sectionScores,
            totalScore,
            maxScore,
            percentage,
            passed,
            rank: calculateGrade(percentage),
        };
    }

    _buildDetailedResults(exam, attempt) {
        const results = [];
        const filteredSections =
            attempt.mode === "practice" && attempt.filteredSections?.length
                ? exam.sections.filter((s) => attempt.filteredSections.includes(s.sectionType))
                : exam.sections;

        for (const section of filteredSections) {
            for (const block of section.blocks) {
                for (const question of block.questions) {
                    const answer = attempt.answers.find(
                        (a) => a.questionId.toString() === question._id.toString(),
                    );
                    results.push({
                        questionId: question._id,
                        questionText: question.questionText,
                        options: question.options,
                        correctAnswer: question.correctAnswer,
                        selectedAnswer: answer?.selectedAnswer || null,
                        isCorrect: answer?.isCorrect || false,
                        explanation: question.explanation,
                        translationVi: question.translationVi,
                        sectionType: section.sectionType,
                        points: question.points,
                        blockContext: block.context,
                    });
                }
            }
        }
        return results;
    }
}

export default new ExamAttemptService();
