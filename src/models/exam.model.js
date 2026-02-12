import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
    {
        examCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },
        title: {
            type: String,
            required: true,
        },
        jlptLevel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "JlptLevel",
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["mock", "practice", "official_format"],
            default: "practice",
        },
        description: String,
        instructions: String,
        sections: [
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
                order: {
                    type: Number,
                    required: true,
                },
                questionGroups: [
                    {
                        // group can be either standalone questions or a shared-content group
                        groupType: {
                            type: String,
                            enum: ["standalone", "shared_content"],
                            default: "standalone",
                        },
                        // when groupType = shared_content, reference the SharedContent document
                        sharedContent: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: "SharedContent",
                        },

                        // legacy / standalone support: category + questions list
                        category: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: "QuestionCategory",
                        },
                        groupName: String,
                        instruction: String,
                        // new structure: explicit questions with order and points
                        questions: [
                            {
                                questionId: {
                                    type: mongoose.Schema.Types.ObjectId,
                                    ref: "Question",
                                },
                                order: Number,
                                points: {
                                    type: Number,
                                    default: 1,
                                },
                            },
                        ],
                        order: Number,
                        totalPoints: Number,
                    },
                ],
            },
        ],
        totalQuestions: {
            type: Number,
            required: true,
        },
        totalScore: {
            type: Number,
            default: 180,
        },
        duration: {
            type: Number,
            required: true,
        },
        passingScore: {
            type: Number,
            default: 100,
        },
        status: {
            type: String,
            enum: ["draft", "published", "archived"],
            default: "draft",
            index: true,
        },
        isPublic: {
            type: Boolean,
            default: false,
            index: true,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        isDemoExam: {
            type: Boolean,
            default: false,
            index: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        publishedAt: Date,
        viewCount: {
            type: Number,
            default: 0,
        },
        attemptCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    },
);

examSchema.index({ jlptLevel: 1, status: 1, isPublic: 1 });

export default mongoose.model("Exam", examSchema);
