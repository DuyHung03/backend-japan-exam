import ExamAttempt from "../models/exam-attempt.model.js";
import Exam from "../models/exam.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

/**
 * Bắt đầu làm bài thi
 */
export const startExam = asyncHandler(async (req, res) => {
    const { examId } = req.body;

    const exam = await Exam.findById(examId);

    if (!exam) {
        return ApiResponse.error(res, "Exam not found", 404);
    }

    if (exam.status !== "published" || !exam.isPublic) {
        return ApiResponse.error(res, "Exam is not available", 400);
    }

    // Kiểm tra đã có bài thi đang làm dở chưa
    const existingAttempt = await ExamAttempt.findOne({
        user: req.user.id,
        exam: examId,
        status: "in_progress",
    });

    if (existingAttempt) {
        return ApiResponse.success(
            res,
            { attempt: existingAttempt },
            "You have an exam in progress",
        );
    }

    const attempt = await ExamAttempt.create({
        user: req.user.id,
        exam: examId,
        status: "in_progress",
        startTime: new Date(),
    });

    await Exam.findByIdAndUpdate(examId, { $inc: { attemptCount: 1 } });

    ApiResponse.created(res, { attempt }, "Exam started successfully");
});

/**
 * Nộp câu trả lời (từng câu hoặc nhiều câu)
 * questionId: _id của embedded question trong exam
 */
export const submitAnswer = asyncHandler(async (req, res) => {
    const { attemptId, questionId, sectionType, selectedAnswer, timeSpent } = req.body;

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

    // Tìm câu hỏi trong exam để check đáp án
    const exam = await Exam.findById(attempt.exam);
    let correctAnswer = null;

    for (const section of exam.sections) {
        for (const block of section.blocks) {
            const question = block.questions.find((q) => q._id.toString() === questionId);
            if (question) {
                correctAnswer = question.correctAnswer;
                break;
            }
        }
        if (correctAnswer !== null) break;
    }

    if (correctAnswer === null) {
        return ApiResponse.error(res, "Question not found in exam", 404);
    }

    const isCorrect = selectedAnswer === correctAnswer;

    // Cập nhật hoặc thêm answer
    const existingIndex = attempt.answers.findIndex((a) => a.questionId.toString() === questionId);

    if (existingIndex !== -1) {
        attempt.answers[existingIndex].selectedAnswer = selectedAnswer;
        attempt.answers[existingIndex].isCorrect = isCorrect;
        attempt.answers[existingIndex].timeSpent = timeSpent;
    } else {
        attempt.answers.push({
            questionId,
            sectionType: sectionType || "",
            selectedAnswer,
            isCorrect,
            timeSpent,
        });
    }

    await attempt.save();

    ApiResponse.success(res, { isCorrect, answer: attempt.answers.at(-1) }, "Answer submitted");
});

/**
 * Nộp bài thi - tính điểm tất cả các phần
 */
export const submitExam = asyncHandler(async (req, res) => {
    const { attemptId } = req.body;

    const attempt = await ExamAttempt.findById(attemptId);

    if (!attempt) {
        return ApiResponse.error(res, "Attempt not found", 404);
    }

    if (attempt.user.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized", 403);
    }

    if (attempt.status !== "in_progress") {
        return ApiResponse.error(res, "Exam already submitted", 400);
    }

    const exam = await Exam.findById(attempt.exam);

    const endTime = new Date();
    const duration = Math.floor((endTime - attempt.startTime) / 1000);

    let totalCorrect = 0;
    let totalWrong = 0;
    let totalSkipped = 0;
    const sectionScores = [];

    // Tính điểm theo từng phần
    for (const section of exam.sections) {
        let sectionCorrect = 0;
        let sectionTotal = 0;
        let sectionMaxScore = section.points;

        for (const block of section.blocks) {
            for (const question of block.questions) {
                sectionTotal++;
                const answer = attempt.answers.find(
                    (a) => a.questionId.toString() === question._id.toString(),
                );

                if (!answer || !answer.selectedAnswer) {
                    totalSkipped++;
                } else if (answer.isCorrect) {
                    totalCorrect++;
                    sectionCorrect++;
                } else {
                    totalWrong++;
                }
            }
        }

        const sectionScore =
            sectionTotal > 0 ? Math.round((sectionCorrect / sectionTotal) * sectionMaxScore) : 0;

        sectionScores.push({
            sectionType: section.sectionType,
            sectionName: section.sectionName,
            correctAnswers: sectionCorrect,
            totalQuestions: sectionTotal,
            score: sectionScore,
            maxScore: sectionMaxScore,
            passed: sectionScore >= (section.passingScore || 0),
        });
    }

    const totalScore = sectionScores.reduce((sum, s) => sum + s.score, 0);
    const percentage = exam.totalPoints > 0 ? Math.round((totalScore / exam.totalPoints) * 100) : 0;
    const passed = totalScore >= exam.passingScore && sectionScores.every((s) => s.passed);

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
        totalQuestions: totalCorrect + totalWrong + totalSkipped,
        correctAnswers: totalCorrect,
        wrongAnswers: totalWrong,
        skippedAnswers: totalSkipped,
        sectionScores,
        totalScore,
        maxScore: exam.totalPoints,
        percentage,
        passed,
        rank,
    };

    await attempt.save();

    ApiResponse.success(res, { attempt }, "Exam submitted successfully");
});

/**
 * Lịch sử làm bài của user
 */
export const getMyAttempts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, examId, status, search } = req.body;

    const query = { user: req.user.id };

    if (examId) query.exam = examId;
    if (status) query.status = status;

    if (search) {
        const exams = await Exam.find({
            $or: [
                { title: { $regex: search, $options: "i" } },
                { examCode: { $regex: search, $options: "i" } },
            ],
        }).select("_id");
        query.exam = { $in: exams.map((e) => e._id) };
    }

    const total = await ExamAttempt.countDocuments(query);
    const attempts = await ExamAttempt.find(query)
        .populate("exam", "title examCode level totalPoints duration")
        .select("-answers")
        .sort({ startTime: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    ApiResponse.paginate(res, attempts, page, limit, total, "Attempts retrieved successfully");
});

/**
 * Chi tiết lần làm bài
 */
export const getAttemptById = asyncHandler(async (req, res) => {
    const { attemptId } = req.body;

    const attempt = await ExamAttempt.findById(attemptId)
        .populate("exam")
        .populate("user", "fullName email");

    if (!attempt) {
        return ApiResponse.error(res, "Attempt not found", 404);
    }

    if (attempt.user._id.toString() !== req.user.id && req.user.role !== "admin") {
        return ApiResponse.error(res, "Not authorized", 403);
    }

    ApiResponse.success(res, { attempt });
});
