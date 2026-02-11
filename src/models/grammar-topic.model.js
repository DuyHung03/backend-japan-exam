import mongoose from "mongoose";

const grammarTopicSchema = new mongoose.Schema(
    {
        jlptLevel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "JlptLevel",
            required: true,
        },
        topicCode: {
            type: String,
            required: true,
            unique: true,
        },
        topicName: {
            type: String,
            required: true,
        },
        topicNameJp: String,
        pattern: String,
        explanation: String,
        examples: [String],
        order: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    },
);

export default mongoose.model("GrammarTopic", grammarTopicSchema);
