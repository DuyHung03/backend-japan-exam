import ExamAttempt from "../models/exam-attempt.model.js";
import Exam from "../models/exam.model.js";
import Question from "../models/question.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

export const startExam = asyncHandler(async (req, res) => {
    const { examId } = req.body;

    const exam = await Exam.findById(examId);

    if (!exam) {
        return ApiResponse.error(res, "Exam not found", 404);
    }

    if (exam.status !== "published" || !exam.isPublic) {
        return ApiResponse.error(res, "Exam is not available", 400);
    }

    const existingAttempt = await ExamAttempt.findOne({
        user: req.user.id,
        exam: examId,
        status: "in_progress",
    });

    if (existingAttempt) {
        return ApiResponse.error(res, "You already have an exam in progress", 400);
    }

    const attempt = await ExamAttempt.create({
        user: req.user.id,
        exam: examId,
        status: "in_progress",
        startTime: new Date(),
    });

    await Exam.findByIdAndUpdate(examId, { $inc: { attemptCount: 1 } });

    ApiResponse.success(res, { attempt }, "Exam started successfully", 201);
});

export const submitAnswer = asyncHandler(async (req, res) => {
    const { attemptId, questionId, selectedAnswer, timeSpent } = req.body;

    const attempt = await ExamAttempt.findById(attemptId);

    if (!attempt) {
        return ApiResponse.error(res, "Attempt not found", 404);
    }

    if (attempt.user.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized", 403);
    }

    if (attempt.status !== "in_progress") {
        return ApiResponse.error(res, "Cannot submit answer to completed exam", 400);
    }

    const question = await Question.findById(questionId);

    if (!question) {
        return ApiResponse.error(res, "Question not found", 404);
    }

    const existingAnswerIndex = attempt.answers.findIndex(
        (a) => a.question.toString() === questionId,
    );

    const isCorrect = selectedAnswer === question.correctAnswer;

    if (existingAnswerIndex !== -1) {
        attempt.answers[existingAnswerIndex].selectedAnswer = selectedAnswer;
        attempt.answers[existingAnswerIndex].isCorrect = isCorrect;
        attempt.answers[existingAnswerIndex].timeSpent = timeSpent;
    } else {
        attempt.answers.push({
            question: questionId,
            selectedAnswer,
            isCorrect,
            timeSpent,
            order: attempt.answers.length + 1,
        });
    }

    await attempt.save();

    ApiResponse.success(res, { attempt }, "Answer submitted");
});

export const submitExam = asyncHandler(async (req, res) => {
    const { attemptId } = req.body;

    const attempt = await ExamAttempt.findById(attemptId)
        .populate("exam")
        .populate("answers.question");

    if (!attempt) {
        return ApiResponse.error(res, "Attempt not found", 404);
    }

    if (attempt.user.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized", 403);
    }

    if (attempt.status !== "in_progress") {
        return ApiResponse.error(res, "Exam already submitted", 400);
    }

    const endTime = new Date();
    const duration = Math.floor((endTime - attempt.startTime) / 1000);

    let correctAnswers = 0;
    let wrongAnswers = 0;
    let skippedAnswers = 0;

    const categoryScoresMap = {};
    const sectionScoresMap = {};

    for (const section of attempt.exam.sections) {
        sectionScoresMap[section.sectionType] = {
            sectionType: section.sectionType,
            correctAnswers: 0,
            totalQuestions: 0,
            score: 0,
            maxScore: section.totalScore,
            passed: false,
        };

        for (const group of section.questionGroups) {
            for (const questionId of group.questionIds) {
                sectionScoresMap[section.sectionType].totalQuestions++;

                const answer = attempt.answers.find(
                    (a) => a.question._id.toString() === questionId.toString(),
                );

                if (!answer || !answer.selectedAnswer) {
                    skippedAnswers++;
                } else if (answer.isCorrect) {
                    correctAnswers++;
                    sectionScoresMap[section.sectionType].correctAnswers++;
                } else {
                    wrongAnswers++;
                }

                const question = await Question.findById(questionId).populate("category");

                if (question && question.category) {
                    const categoryId = question.category._id.toString();

                    if (!categoryScoresMap[categoryId]) {
                        categoryScoresMap[categoryId] = {
                            category: categoryId,
                            correctAnswers: 0,
                            totalQuestions: 0,
                            accuracy: 0,
                        };
                    }

                    categoryScoresMap[categoryId].totalQuestions++;
                    if (answer && answer.isCorrect) {
                        categoryScoresMap[categoryId].correctAnswers++;
                    }
                }
            }
        }

        const sectionScore = sectionScoresMap[section.sectionType];
        sectionScore.score = Math.round(
            (sectionScore.correctAnswers / sectionScore.totalQuestions) * sectionScore.maxScore,
        );
        sectionScore.passed = sectionScore.score >= (section.passingScore || 19);
    }

    for (const categoryId in categoryScoresMap) {
        const cat = categoryScoresMap[categoryId];
        cat.accuracy = Math.round((cat.correctAnswers / cat.totalQuestions) * 100);
    }

    const totalScore = Object.values(sectionScoresMap).reduce((sum, s) => sum + s.score, 0);

    const percentage = Math.round((totalScore / attempt.exam.totalScore) * 100);
    const passed =
        totalScore >= attempt.exam.passingScore &&
        Object.values(sectionScoresMap).every((s) => s.passed);

    let rank;
    if (percentage >= 90) rank = "A";
    else if (percentage >= 80) rank = "B";
    else if (percentage >= 70) rank = "C";
    else if (percentage >= 60) rank = "D";
    else rank = "F";

    attempt.status = "submitted";
    attempt.endTime = endTime;
    attempt.submitTime = endTime;
    attempt.duration = duration;

    attempt.results = {
        totalQuestions: attempt.answers.length,
        correctAnswers,
        wrongAnswers,
        skippedAnswers,
        sectionScores: Object.values(sectionScoresMap),
        categoryScores: Object.values(categoryScoresMap),
        totalScore,
        maxScore: attempt.exam.totalScore,
        percentage,
        passed,
        rank,
    };

    await attempt.save();

    for (const answer of attempt.answers) {
        if (answer.question) {
            const questionDoc = await Question.findById(answer.question._id);
            if (questionDoc) {
                const currentCorrectRate = questionDoc.correctRate || 0;
                const usageCount = questionDoc.usageCount || 1;

                const newCorrectRate =
                    currentCorrectRate === 0
                        ? answer.isCorrect
                            ? 100
                            : 0
                        : Math.round(
                              (currentCorrectRate * (usageCount - 1) +
                                  (answer.isCorrect ? 100 : 0)) /
                                  usageCount,
                          );

                await Question.findByIdAndUpdate(answer.question._id, {
                    correctRate: newCorrectRate,
                });
            }
        }
    }

    ApiResponse.success(res, { attempt }, "Exam submitted successfully");
});

export const getMyAttempts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, examId, status } = req.body;

    const query = { user: req.user.id };

    if (examId) query.exam = examId;
    if (status) query.status = status;

    const total = await ExamAttempt.countDocuments(query);
    const attempts = await ExamAttempt.find(query)
        .populate("exam", "title examCode jlptLevel totalScore")
        .populate("exam.jlptLevel", "level name")
        .select("-answers -aiAnalysis")
        .sort({ startTime: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    ApiResponse.paginate(res, { attempts }, page, limit, total);
});

export const getAttemptById = asyncHandler(async (req, res) => {
    const { attemptId } = req.body;
    
    const attempt = await ExamAttempt.findById(attemptId)
        .populate("exam")
        .populate("user", "fullName email")
        .populate("answers.question")
        .populate("results.categoryScores.category", "name code");

    if (!attempt) {
        return ApiResponse.error(res, "Attempt not found", 404);
    }

    if (attempt.user._id.toString() !== req.user.id && req.user.role !== "admin") {
        return ApiResponse.error(res, "Not authorized", 403);
    }

    ApiResponse.success(res, { attempt });
});
{ attemptId } = req.body;
    
    const attempt = await ExamAttempt.findById(attemptI
export const generateAIAnalysis = asyncHandler(async (req, res) => {
    const attempt = await ExamAttempt.findById(req.params.id).populate(
        "results.categoryScores.category",
    );

    if (!attempt) {
        return ApiResponse.error(res, "Attempt not found", 404);
    }

    if (attempt.user.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized", 403);
    }

    if (attempt.status !== "submitted") {
        return ApiResponse.error(res, "Exam not submitted yet", 400);
    }

    const strengths = [];
    const weaknesses = [];
    const recommendations = [];
    const skillLevels = [];

    for (const categoryScore of attempt.results.categoryScores) {
        const accuracy = categoryScore.accuracy;
        const categoryName = categoryScore.category?.name || "Unknown";

        let level;
        if (accuracy >= 80) level = "excellent";
        else if (accuracy >= 65) level = "good";
        else if (accuracy >= 50) level = "average";
        else level = "weak";

        skillLevels.push({
            skill: categoryName,
            level,
            score: accuracy,
        });

        if (accuracy >= 80) {
            strengths.push(`Excellent performance in ${categoryName} (${accuracy}%)`);
        } else if (accuracy < 50) {
            weaknesses.push(`Needs improvement in ${categoryName} (${accuracy}%)`);
            recommendations.push(`Focus more on ${categoryName} exercises and practice`);
        }
    }

    if (attempt.results.passed) {
        recommendations.push("Continue practicing to maintain your level");
        recommendations.push("Consider moving to the next JLPT level");
    } else {
        recommendations.push("Review the questions you got wrong");
        recommendations.push("Practice more mock exams at this level");
        recommendations.push("Focus on sections where you scored below passing marks");
    }

    attempt.aiAnalysis = {
        strengths,
        weaknesses,
        recommendations,
        skillLevels,
        generatedAt: new Date(),
    };

    await attempt.save();

    ApiResponse.success(res, { analysis: attempt.aiAnalysis }, "AI analysis generated");
});
