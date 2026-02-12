import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
    {
        jlptLevel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "JlptLevel",
            required: true,
            index: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuestionCategory",
            required: true,
            index: true,
        },
        grammarTopic: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "GrammarTopic",
        },
        // Optional reference to shared content (passage / audio) when question belongs to a group
        sharedContent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SharedContent",
        },
        questionType: {
            type: String,
            enum: [
                "kanji_reading",
                "kanji_writing",
                "vocab_meaning",
                "vocab_usage",
                "grammar_choose",
                "grammar_arrange",
                "reading_comprehension",
                "listening_task",
                "listening_point",
                "listening_general",
                "listening_quick",
            ],
            required: true,
            index: true,
        },
        // Position in a shared-content group (optional)
        orderInGroup: {
            type: Number,
            default: 1,
        },
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "medium",
        },
        content: {
            text: {
                type: String,
                required: true,
            },
            images: [String],
            audio: String,
            passage: String,
            passageImages: [String],
        },
        options: [
            {
                label: {
                    type: String,
                    required: true,
                },
                text: {
                    type: String,
                    required: true,
                },
                image: String,
            },
        ],
        correctAnswer: {
            type: String,
            required: true,
        },
        explanation: String,
        translationVi: String,
        status: {
            type: String,
            enum: ["draft", "pending", "approved", "rejected"],
            default: "draft",
            index: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        approvedAt: Date,
        usageCount: {
            type: Number,
            default: 0,
        },
        correctRate: {
            type: Number,
            min: 0,
            max: 100,
        },
        tags: [String],
        isPublic: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    },
);

questionSchema.index({ jlptLevel: 1, category: 1, status: 1 });
questionSchema.index({ createdBy: 1 });

export default mongoose.model("Question", questionSchema);
