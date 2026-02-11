import mongoose from "mongoose";

const questionCategorySchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
        },
        nameJp: String,
        sectionType: {
            type: String,
            enum: ["language_knowledge", "reading", "listening"],
            required: true,
        },
        description: String,
        order: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    },
);

export default mongoose.model("QuestionCategory", questionCategorySchema);
