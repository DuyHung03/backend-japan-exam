import Exam from "../models/exam.model.js";
import QuestionBlock from "../models/question-block.model.js";
import Question from "../models/question.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

/**
 * Tạo bài thi mới
 *
 * Body cần có:
 * - title, level, type, duration, description, instructions
 * - sections: array gồm các phần thi, mỗi phần có:
 *   - sectionType, sectionName, duration, order, passingScore
 *   - blocks: array gồm các block câu hỏi, MỖI block dùng 1 trong 3 cách:
 *     1) blockId: ObjectId → copy cả QuestionBlock từ bank
 *     2) questionIds: [ObjectId] → pick câu hỏi riêng lẻ từ bank
 *     3) questions: [{ questionText, options, correctAnswer, ... }] → inline (thủ công/file/json)
 *     + title?, instruction?, questionType?, order?, pointsPerQuestion?, context?
 *
 * Câu hỏi được COPY hoặc nhúng trực tiếp vào exam (embedded, độc lập).
 */
export const createExam = asyncHandler(async (req, res) => {
    const { title, level, sections, ...rest } = req.body;

    const examCode = `${level}_${Date.now()}`;

    let totalQuestions = 0;
    let totalPoints = 0;
    const processedSections = [];

    for (const section of sections) {
        let sectionQuestionCount = 0;
        let sectionPoints = 0;
        const processedBlocks = [];

        if (Array.isArray(section.blocks) && section.blocks.length > 0) {
            for (const blockInput of section.blocks) {
                const processedBlock = {
                    title: blockInput.title,
                    instruction: blockInput.instruction,
                    questionType: blockInput.questionType,
                    order: blockInput.order || 0,
                    context: blockInput.context || null,
                    questions: [],
                };

                if (blockInput.blockId) {
                    // ─── Cách 1: Copy cả block từ bank ───
                    const block = await QuestionBlock.findById(blockInput.blockId);
                    if (!block) {
                        return ApiResponse.error(
                            res,
                            `Question block ${blockInput.blockId} not found`,
                            404,
                        );
                    }

                    const blockQuestions = await Question.find({
                        block: blockInput.blockId,
                    }).sort({ orderInBlock: 1 });

                    processedBlock.sourceBlockId = block._id;
                    processedBlock.title = processedBlock.title || block.title;
                    processedBlock.context = block.context || null;
                    processedBlock.instruction = processedBlock.instruction || block.instructions;

                    processedBlock.questions = blockQuestions.map((q, idx) => ({
                        sourceQuestionId: q._id,
                        questionText: q.questionText,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        explanation: q.explanation,
                        translationVi: q.translationVi,
                        media: q.media,
                        points: blockInput.pointsPerQuestion || 1,
                        order: idx + 1,
                    }));

                    sectionQuestionCount += blockQuestions.length;
                    sectionPoints += blockQuestions.length * (blockInput.pointsPerQuestion || 1);

                    await Question.updateMany(
                        { _id: { $in: blockQuestions.map((q) => q._id) } },
                        { $inc: { usageCount: 1 } },
                    );
                } else if (
                    Array.isArray(blockInput.questionIds) &&
                    blockInput.questionIds.length > 0
                ) {
                    // ─── Cách 2: Pick câu hỏi riêng lẻ từ bank ───
                    const questions = await Question.find({
                        _id: { $in: blockInput.questionIds },
                    });

                    processedBlock.questions = questions.map((q, idx) => ({
                        sourceQuestionId: q._id,
                        questionText: q.questionText,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        explanation: q.explanation,
                        translationVi: q.translationVi,
                        media: q.media,
                        points: blockInput.pointsPerQuestion || 1,
                        order: idx + 1,
                    }));

                    sectionQuestionCount += questions.length;
                    sectionPoints += questions.length * (blockInput.pointsPerQuestion || 1);

                    await Question.updateMany(
                        { _id: { $in: blockInput.questionIds } },
                        { $inc: { usageCount: 1 } },
                    );
                } else if (Array.isArray(blockInput.questions) && blockInput.questions.length > 0) {
                    // ─── Cách 3: Inline questions (thủ công / import file / JSON) ───
                    processedBlock.questions = blockInput.questions.map((q, idx) => ({
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
                        points: q.points || blockInput.pointsPerQuestion || 1,
                        order: q.order || idx + 1,
                    }));

                    sectionQuestionCount += processedBlock.questions.length;
                    sectionPoints += processedBlock.questions.reduce(
                        (s, q) => s + (q.points || 1),
                        0,
                    );
                }

                processedBlocks.push(processedBlock);
            }
        }

        processedSections.push({
            sectionType: section.sectionType,
            sectionName: section.sectionName,
            duration: section.duration,
            order: section.order,
            questionCount: sectionQuestionCount,
            points: sectionPoints,
            passingScore: section.passingScore || 0,
            blocks: processedBlocks,
        });

        totalQuestions += sectionQuestionCount;
        totalPoints += sectionPoints;
    }

    const exam = await Exam.create({
        examCode,
        title,
        level,
        sections: processedSections,
        totalQuestions,
        totalPoints,
        createdBy: req.user.id,
        ...rest,
    });

    ApiResponse.created(res, { exam }, "Exam created successfully");
});

/**
 * Danh sách bài thi - có search & pagination
 */
export const getExams = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, level, status, type, search } = req.body;

    const query = {};

    if (req.user.role === "teacher") {
        query.$or = [{ createdBy: req.user.id }, { isPublic: true }];
    } else if (req.user.role === "user") {
        query.status = "published";
        query.isPublic = true;
    }

    if (level) query.level = level;
    if (status && req.user.role !== "user") query.status = status;
    if (type) query.type = type;

    if (search) {
        const searchCondition = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { examCode: { $regex: search, $options: "i" } },
        ];
        if (query.$or) {
            query.$and = [{ $or: query.$or }, { $or: searchCondition }];
            delete query.$or;
        } else {
            query.$or = searchCondition;
        }
    }

    const total = await Exam.countDocuments(query);
    const exams = await Exam.find(query)
        .populate("createdBy", "fullName email")
        .select("-sections") // Không trả sections khi list
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    ApiResponse.paginate(res, exams, page, limit, total, "Exams retrieved successfully");
});

/**
 * Chi tiết bài thi (kèm tất cả câu hỏi embedded)
 */
export const getExamById = asyncHandler(async (req, res) => {
    const { examId } = req.body;

    const exam = await Exam.findById(examId).populate("createdBy", "fullName email").lean(); // Use lean for better performance

    if (!exam) {
        return ApiResponse.error(res, "Exam not found", 404);
    }

    if (req.user.role === "user" && (exam.status !== "published" || !exam.isPublic)) {
        return ApiResponse.error(res, "Not authorized to view this exam", 403);
    }

    await Exam.findByIdAndUpdate(examId, { $inc: { viewCount: 1 } });

    // Calculate total questions for display
    let totalQuestions = 0;
    if (exam.sections) {
        exam.sections.forEach((section) => {
            if (section.blocks) {
                section.blocks.forEach((block) => {
                    if (block.questions) {
                        totalQuestions += block.questions.length;
                    }
                });
            }
        });
    }

    // Add calculated total to exam object
    exam.totalQuestions = totalQuestions;

    console.log("Exam sections found:", exam.sections?.length || 0);
    console.log("Total questions calculated:", totalQuestions);

    ApiResponse.success(res, { exam });
});

/**
 * Cập nhật bài thi (metadata, không thay đổi câu hỏi)
 */
export const updateExam = asyncHandler(async (req, res) => {
    const { examId, ...updateData } = req.body;

    let exam = await Exam.findById(examId);

    if (!exam) {
        return ApiResponse.error(res, "Exam not found", 404);
    }

    if (req.user.role === "teacher" && exam.createdBy.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized to update this exam", 403);
    }

    exam = await Exam.findByIdAndUpdate(examId, updateData, {
        new: true,
        runValidators: true,
    });

    ApiResponse.success(res, { exam }, "Exam updated successfully");
});

/**
 * Xóa bài thi
 */
export const deleteExam = asyncHandler(async (req, res) => {
    const { examId } = req.body;

    const exam = await Exam.findById(examId);

    if (!exam) {
        return ApiResponse.error(res, "Exam not found", 404);
    }

    if (req.user.role === "teacher" && exam.createdBy.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized to delete this exam", 403);
    }

    if (exam.attemptCount > 0 && req.user.role !== "admin") {
        return ApiResponse.error(res, "Cannot delete exam with attempts", 400);
    }

    await exam.deleteOne();

    ApiResponse.success(res, null, "Exam deleted successfully");
});

/**
 * Publish bài thi
 */
export const publishExam = asyncHandler(async (req, res) => {
    const { examId } = req.body;

    const exam = await Exam.findById(examId);

    if (!exam) {
        return ApiResponse.error(res, "Exam not found", 404);
    }

    if (req.user.role === "teacher" && exam.createdBy.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized", 403);
    }

    if (exam.totalQuestions === 0) {
        return ApiResponse.error(res, "Cannot publish exam with no questions", 400);
    }

    exam.status = "published";
    exam.publishedAt = new Date();
    await exam.save();

    ApiResponse.success(res, { exam }, "Exam published successfully");
});

/**
 * Lấy bài thi mẫu - unified blocks structure
 */
export const getSampleExam = asyncHandler(async (req, res) => {
    const sampleExam = {
        examCode: "JLPT_N5_SAMPLE_2024",
        title: "JLPT N5 Sample Exam - Official Format",
        level: "N5",
        sections: [
            {
                sectionType: "vocabulary",
                sectionName: "Character / Vocabulary (文字・語彙)",
                duration: 20,
                order: 1,
                questionCount: 4,
                points: 4,
                passingScore: 2,
                blocks: [
                    {
                        sourceBlockId: null,
                        title: null,
                        context: null,
                        order: 1,
                        questions: [
                            {
                                sourceQuestionId: null,
                                questionText: "____は毎日学校に行きます。",
                                options: [
                                    { label: "1", text: "田中さん" },
                                    { label: "2", text: "学生です" },
                                    { label: "3", text: "朝です" },
                                    { label: "4", text: "友達です" },
                                ],
                                correctAnswer: "1",
                                explanation:
                                    "田中さん means 'Tanaka' and is the correct subject for this sentence.",
                                translationVi: "Tanaka goes to school every day.",
                                points: 1,
                                order: 1,
                            },
                        ],
                    },
                    {
                        sourceBlockId: null,
                        title: null,
                        context: null,
                        order: 2,
                        questions: [
                            {
                                sourceQuestionId: null,
                                questionText: "この漢字は何ですか。(分 けのぶんI)",
                                options: [
                                    { label: "1", text: "ぶん" },
                                    { label: "2", text: "わん" },
                                    { label: "3", text: "ふん" },
                                    { label: "4", text: "ぺん" },
                                ],
                                correctAnswer: "1",
                                explanation: "分 (ぶん) means minutes or portions.",
                                translationVi: "What is this kanji? (分)",
                                points: 1,
                                order: 1,
                            },
                        ],
                    },
                    {
                        sourceBlockId: null,
                        title: null,
                        context: null,
                        order: 3,
                        questions: [
                            {
                                sourceQuestionId: null,
                                questionText: "私の趣味は_____です。写真を撮ることが好きです。",
                                options: [
                                    { label: "1", text: "カメラ" },
                                    { label: "2", text: "カメラマン" },
                                    { label: "3", text: "カメラを撮る" },
                                    { label: "4", text: "写真" },
                                ],
                                correctAnswer: "4",
                                explanation:
                                    "写真 (しゃしん) means 'photography' which fits the context.",
                                translationVi: "My hobby is ____. I like taking photos.",
                                points: 1,
                                order: 1,
                            },
                        ],
                    },
                    {
                        sourceBlockId: null,
                        title: null,
                        context: null,
                        order: 4,
                        questions: [
                            {
                                sourceQuestionId: null,
                                questionText: "会社は午後5時に_____です。",
                                options: [
                                    { label: "1", text: "閉めます" },
                                    { label: "2", text: "終わります" },
                                    { label: "3", text: "なります" },
                                    { label: "4", text: "あります" },
                                ],
                                correctAnswer: "2",
                                explanation: "終わります (おわります) means 'closes/finishes'.",
                                translationVi: "The company _____ at 5 PM.",
                                points: 1,
                                order: 1,
                            },
                        ],
                    },
                ],
            },
            {
                sectionType: "grammar",
                sectionName: "Grammar (文法)",
                duration: 30,
                order: 2,
                questionCount: 4,
                points: 4,
                passingScore: 2,
                blocks: [
                    {
                        sourceBlockId: null,
                        title: null,
                        context: null,
                        order: 1,
                        questions: [
                            {
                                sourceQuestionId: null,
                                questionText: "田中さんは毎日公園_____歩きます。",
                                options: [
                                    { label: "1", text: "を" },
                                    { label: "2", text: "で" },
                                    { label: "3", text: "に" },
                                    { label: "4", text: "から" },
                                ],
                                correctAnswer: "2",
                                explanation: "で marks the location where an action takes place.",
                                translationVi: "Tanaka walks in the park every day.",
                                points: 1,
                                order: 1,
                            },
                        ],
                    },
                    {
                        sourceBlockId: null,
                        title: null,
                        context: null,
                        order: 2,
                        questions: [
                            {
                                sourceQuestionId: null,
                                questionText: "私は昨年東京_____中国へ旅行しました。",
                                options: [
                                    { label: "1", text: "から" },
                                    { label: "2", text: "で" },
                                    { label: "3", text: "まで" },
                                    { label: "4", text: "に" },
                                ],
                                correctAnswer: "1",
                                explanation: "から means 'from' indicating the starting point.",
                                translationVi: "Last year, I traveled from Tokyo to China.",
                                points: 1,
                                order: 1,
                            },
                        ],
                    },
                    {
                        sourceBlockId: null,
                        title: null,
                        context: null,
                        order: 3,
                        questions: [
                            {
                                sourceQuestionId: null,
                                questionText: "田中さんは毎日6時_____起きます。",
                                options: [
                                    { label: "1", text: "までに" },
                                    { label: "2", text: "から" },
                                    { label: "3", text: "に" },
                                    { label: "4", text: "で" },
                                ],
                                correctAnswer: "3",
                                explanation: "に marks the time at which an action occurs.",
                                translationVi: "Tanaka wakes up at 6 o'clock every day.",
                                points: 1,
                                order: 1,
                            },
                        ],
                    },
                    {
                        sourceBlockId: null,
                        title: null,
                        context: null,
                        order: 4,
                        questions: [
                            {
                                sourceQuestionId: null,
                                questionText: "私は毎日コーヒーを飲みながら、新聞_____です。",
                                options: [
                                    { label: "1", text: "を読みます" },
                                    { label: "2", text: "を読んでいます" },
                                    { label: "3", text: "を読みながらです" },
                                    { label: "4", text: "は読みます" },
                                ],
                                correctAnswer: "1",
                                explanation:
                                    "Reading newspaper is the action being done while drinking coffee.",
                                translationVi:
                                    "I read the newspaper while drinking coffee every day.",
                                points: 1,
                                order: 1,
                            },
                        ],
                    },
                ],
            },
            {
                sectionType: "reading",
                sectionName: "Reading Comprehension (読解)",
                duration: 40,
                order: 3,
                questionCount: 3,
                points: 3,
                passingScore: 2,
                blocks: [
                    {
                        sourceBlockId: null,
                        title: "A Day in the Life",
                        instruction:
                            "読んでから、問題に答えてください。(Read and then answer the questions.)",
                        questionType: "reading-comprehension",
                        order: 1,
                        context: {
                            text: "私は今年から会社で働いています。会社は東京にあります。毎日朝7時に家を出て、電車で会社に行きます。電車は30分ぐらいかかります。会社では9時から5時まで働きます。昼ごはんは12時から1時までです。昼ごはんの後で、また働きます。5時に会社が終わったら、友達に会うこともあります。友達と一緒にコーヒーを飲んだり、ご飯を食べたりします。家に帰ることは夜8時ぐらいです。",
                        },
                        questions: [
                            {
                                sourceQuestionId: null,
                                questionText: "この人の会社は何時から何時まで働きますか。",
                                options: [
                                    { label: "1", text: "7時から5時まで" },
                                    { label: "2", text: "9時から5時まで" },
                                    { label: "3", text: "8時から6時まで" },
                                    { label: "4", text: "10時から6時まで" },
                                ],
                                correctAnswer: "2",
                                explanation: "The passage states 会社では9時から5時まで働きます。",
                                translationVi: "What time does this person work at the company?",
                                points: 1,
                                order: 1,
                            },
                            {
                                sourceQuestionId: null,
                                questionText: "この人は会社に行くために、何を使いますか。",
                                options: [
                                    { label: "1", text: "車" },
                                    { label: "2", text: "電車" },
                                    { label: "3", text: "バス" },
                                    { label: "4", text: "自転車" },
                                ],
                                correctAnswer: "2",
                                explanation:
                                    "The passage mentions 電車で会社に行きます (goes to company by train).",
                                translationVi: "What does this person use to go to the company?",
                                points: 1,
                                order: 2,
                            },
                            {
                                sourceQuestionId: null,
                                questionText: "この人はいつ家に帰ることが多いですか。",
                                options: [
                                    { label: "1", text: "夜6時ぐらい" },
                                    { label: "2", text: "夜7時ぐらい" },
                                    { label: "3", text: "夜8時ぐらい" },
                                    { label: "4", text: "夜9時ぐらい" },
                                ],
                                correctAnswer: "3",
                                explanation: "The passage states 家に帰ることは夜8時ぐらいです。",
                                translationVi: "What time does this person usually go home?",
                                points: 1,
                                order: 3,
                            },
                        ],
                    },
                ],
            },
            {
                sectionType: "listening",
                sectionName: "Listening Comprehension (聴解)",
                duration: 20,
                order: 4,
                questionCount: 3,
                points: 3,
                passingScore: 2,
                blocks: [
                    {
                        sourceBlockId: null,
                        title: "Dialogue at a Restaurant",
                        instruction:
                            "Listen to the dialogue and answer the questions below. You will hear the dialogue twice.",
                        questionType: "listening-comprehension",
                        order: 1,
                        context: {
                            text: "店員: いらっしゃいませ。何名様ですか？\nお客さん: 2人です。\n店員: こちらへどうぞ。メニューをどうぞ。\nお客さん: ありがとうございます。この定食は何ですか？\n店員: 特製カレーライスです。とても人気があります。\nお客さん: わかりました。では、カレーライスとコーヒーをください。",
                            audioUrl: "listening_sample_n5_1.mp3",
                            audioScript: "Restaurant dialogue",
                        },
                        questions: [
                            {
                                sourceQuestionId: null,
                                questionText: "何人来ましたか。",
                                options: [
                                    { label: "1", text: "1人" },
                                    { label: "2", text: "2人" },
                                    { label: "3", text: "3人" },
                                    { label: "4", text: "4人" },
                                ],
                                correctAnswer: "2",
                                explanation: "The customer says 2人です。",
                                translationVi: "How many people came?",
                                points: 1,
                                order: 1,
                            },
                            {
                                sourceQuestionId: null,
                                questionText: "定食は何ですか。",
                                options: [
                                    { label: "1", text: "うどん" },
                                    { label: "2", text: "天ぷら" },
                                    { label: "3", text: "カレーライス" },
                                    { label: "4", text: "寿司" },
                                ],
                                correctAnswer: "3",
                                explanation: "The staff mentions 特製カレーライスです。",
                                translationVi: "What is the special set meal?",
                                points: 1,
                                order: 2,
                            },
                            {
                                sourceQuestionId: null,
                                questionText: "客さんは何を飲みますか。",
                                options: [
                                    { label: "1", text: "ジュース" },
                                    { label: "2", text: "ビール" },
                                    { label: "3", text: "水" },
                                    { label: "4", text: "コーヒー" },
                                ],
                                correctAnswer: "4",
                                explanation:
                                    "The customer orders カレーライスとコーヒーをください。",
                                translationVi: "What drink did the customer order?",
                                points: 1,
                                order: 3,
                            },
                        ],
                    },
                ],
            },
        ],
        totalQuestions: 14,
        totalPoints: 14,
        duration: 110,
    };

    ApiResponse.success(res, sampleExam, "Sample exam fetched successfully");
});
