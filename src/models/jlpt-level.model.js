import mongoose from "mongoose";

const jlptLevelSchema = new mongoose.Schema(
    {
        level: {
            type: String,
            required: true,
            unique: true,
            enum: ["N5", "N4", "N3", "N2", "N1"],
        },
        name: {
            type: String,
            required: true,
        },
        description: String,
        passingScore: {
            type: Number,
            required: true,
            default: 100,
        },
        totalScore: {
            type: Number,
            required: true,
            default: 180,
        },
        duration: {
            type: Number,
            required: true,
        },
        structure: [
            {
                sectionType: {
                    type: String,
                    enum: ["language_knowledge", "reading", "listening"],
                    required: true,
                },
                sectionName: {
                    type: String,
                    required: true,
                },
                duration: {
                    type: Number,
                    required: true,
                },
                passingScore: {
                    type: Number,
                    default: 19,
                },
                totalScore: {
                    type: Number,
                    required: true,
                },
            },
        ],
        order: {
            type: Number,
            required: true,
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

export default mongoose.model("JlptLevel", jlptLevelSchema);
