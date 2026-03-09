import mongoose from "mongoose";

/**
 * Question - Câu hỏi trong ngân hàng
 *
 * Mỗi câu hỏi luôn thuộc 1 QuestionBlock:
 *   - Standalone: block chỉ có 1 câu, không có context
 *   - Group: block có context chung + nhiều câu
 *
 * questionType theo chuẩn JLPT:
 *   Vocabulary: kanji_reading, orthography, word_formation, contextual_expressions, paraphrases, usage
 *   Grammar: grammar_form, sentence_composition, text_grammar
 *   Reading: short_passages, mid_passages, long_passages, integrated_reading, thematic_comprehension, information_retrieval
 *   Listening: task_based, key_points, general_outline, verbal_expressions, quick_response, integrated_listening
 */
const questionSchema = new mongoose.Schema(
    {
        block: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuestionBlock",
            required: [true, "Block is required"],
            index: true,
        },
        orderInBlock: {
            type: Number,
            default: 0,
        },
        questionText: {
            type: String,
            required: [true, "Question text is required"],
        },
        media: {
            image: String,
            audio: String,
        },
        options: [
            {
                label: { type: String, required: true },
                text: { type: String, required: true },
            },
        ],
        correctAnswer: {
            type: String,
            required: [true, "Correct answer is required"],
        },
        explanation: String,
        translationVi: String,
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "medium",
        },
        tags: [String],
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        usageCount: {
            type: Number,
            default: 0,
        },
        correctRate: {
            type: Number,
            min: 0,
            max: 100,
        },
    },
    { timestamps: true },
);

// Compound indexes
questionSchema.index({ block: 1, orderInBlock: 1 });
questionSchema.index({ createdBy: 1 });
questionSchema.index({ block: 1, isActive: 1 });

// Full-text search index
questionSchema.index({
    questionText: "text",
    explanation: "text",
    translationVi: "text",
    tags: "text",
});

export default mongoose.model("Question", questionSchema);
