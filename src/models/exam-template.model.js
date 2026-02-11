import mongoose from "mongoose";

const examTemplateSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        jlptLevel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "JlptLevel",
            required: true,
        },
        description: String,
        autoGenerationRules: [
            {
                sectionType: {
                    type: String,
                    enum: ["language_knowledge", "reading", "listening"],
                    required: true,
                },
                category: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "QuestionCategory",
                },
                questionType: String,
                count: {
                    type: Number,
                    required: true,
                },
                difficulty: {
                    type: String,
                    enum: ["easy", "medium", "hard", "mixed"],
                },
                difficultyDistribution: {
                    easy: Number,
                    medium: Number,
                    hard: Number,
                },
                grammarTopics: [
                    {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "GrammarTopic",
                    },
                ],
                order: Number,
            },
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    },
);

export default mongoose.model("ExamTemplate", examTemplateSchema);
