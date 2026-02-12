import mongoose from "mongoose";

const sharedContentSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["reading_passage", "listening_audio", "image_set"],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        content: {
            text: String,
            images: [String],
            audioUrl: String,
            audioScript: String,
            duration: Number,
            wordCount: Number,
            level: String,
        },
        instructions: String,
        jlptLevel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "JlptLevel",
            required: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuestionCategory",
            required: true,
        },
        status: {
            type: String,
            enum: ["draft", "approved", "rejected"],
            default: "draft",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        tags: [String],
    },
    {
        timestamps: true,
    },
);

sharedContentSchema.index({ jlptLevel: 1, category: 1 });

export default mongoose.model("SharedContent", sharedContentSchema);
