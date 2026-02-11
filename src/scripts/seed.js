import "dotenv/config";
import mongoose from "mongoose";
import GrammarTopic from "../models/grammar-topic.model.js";
import JlptLevel from "../models/jlpt-level.model.js";
import QuestionCategory from "../models/question-category.model.js";
import User from "../models/user.model.js";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ MongoDB Connected");
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error.message);
        process.exit(1);
    }
};

const seedUsers = async () => {
    await User.deleteMany();

    const users = [
        {
            email: "admin@jlpt.com",
            password: "admin123",
            fullName: "Admin User",
            role: "admin",
            status: "active",
        },
        {
            email: "teacher@jlpt.com",
            password: "teacher123",
            fullName: "Teacher Tanaka",
            role: "teacher",
            status: "active",
        },
        {
            email: "user@jlpt.com",
            password: "user123",
            fullName: "Student Nguyen Van A",
            role: "user",
            status: "active",
        },
    ];

    await User.create(users);
    console.log("✅ Users seeded");
};

const seedJlptLevels = async () => {
    await JlptLevel.deleteMany();

    const levels = [
        {
            level: "N5",
            name: "Sơ cấp 1",
            description: "Có thể hiểu tiếng Nhật cơ bản",
            passingScore: 80,
            totalScore: 180,
            duration: 105,
            structure: [
                {
                    sectionType: "language_knowledge",
                    sectionName: "Kiến thức ngôn ngữ (Chữ, từ vựng)",
                    duration: 25,
                    passingScore: 19,
                    totalScore: 60,
                },
                {
                    sectionType: "reading",
                    sectionName: "Kiến thức ngôn ngữ (Ngữ pháp, Đọc hiểu)",
                    duration: 50,
                    passingScore: 19,
                    totalScore: 60,
                },
                {
                    sectionType: "listening",
                    sectionName: "Nghe hiểu",
                    duration: 30,
                    passingScore: 19,
                    totalScore: 60,
                },
            ],
            order: 5,
            isActive: true,
        },
        {
            level: "N4",
            name: "Sơ cấp 2",
            description: "Có thể hiểu tiếng Nhật cơ bản",
            passingScore: 90,
            totalScore: 180,
            duration: 125,
            structure: [
                {
                    sectionType: "language_knowledge",
                    sectionName: "Kiến thức ngôn ngữ (Chữ, từ vựng)",
                    duration: 30,
                    passingScore: 19,
                    totalScore: 60,
                },
                {
                    sectionType: "reading",
                    sectionName: "Kiến thức ngôn ngữ (Ngữ pháp, Đọc hiểu)",
                    duration: 60,
                    passingScore: 19,
                    totalScore: 60,
                },
                {
                    sectionType: "listening",
                    sectionName: "Nghe hiểu",
                    duration: 35,
                    passingScore: 19,
                    totalScore: 60,
                },
            ],
            order: 4,
            isActive: true,
        },
        {
            level: "N3",
            name: "Trung cấp",
            description: "Có thể hiểu tiếng Nhật thường dùng ở mức độ nhất định",
            passingScore: 95,
            totalScore: 180,
            duration: 140,
            structure: [
                {
                    sectionType: "language_knowledge",
                    sectionName: "Kiến thức ngôn ngữ (Chữ, từ vựng)",
                    duration: 30,
                    passingScore: 19,
                    totalScore: 60,
                },
                {
                    sectionType: "reading",
                    sectionName: "Kiến thức ngôn ngữ (Ngữ pháp, Đọc hiểu)",
                    duration: 70,
                    passingScore: 19,
                    totalScore: 60,
                },
                {
                    sectionType: "listening",
                    sectionName: "Nghe hiểu",
                    duration: 40,
                    passingScore: 19,
                    totalScore: 60,
                },
            ],
            order: 3,
            isActive: true,
        },
        {
            level: "N2",
            name: "Trung cao cấp",
            description:
                "Có thể hiểu tiếng Nhật thường dùng và hiểu trong nhiều tình huống ở mức độ nhất định",
            passingScore: 90,
            totalScore: 180,
            duration: 155,
            structure: [
                {
                    sectionType: "language_knowledge",
                    sectionName: "Kiến thức ngôn ngữ (Chữ, từ vựng, Ngữ pháp)",
                    duration: 105,
                    passingScore: 19,
                    totalScore: 60,
                },
                {
                    sectionType: "reading",
                    sectionName: "Đọc hiểu",
                    duration: 0,
                    passingScore: 19,
                    totalScore: 60,
                },
                {
                    sectionType: "listening",
                    sectionName: "Nghe hiểu",
                    duration: 50,
                    passingScore: 19,
                    totalScore: 60,
                },
            ],
            order: 2,
            isActive: true,
        },
        {
            level: "N1",
            name: "Cao cấp",
            description: "Có thể hiểu tiếng Nhật trong nhiều tình huống",
            passingScore: 100,
            totalScore: 180,
            duration: 170,
            structure: [
                {
                    sectionType: "language_knowledge",
                    sectionName: "Kiến thức ngôn ngữ (Chữ, từ vựng, Ngữ pháp)",
                    duration: 110,
                    passingScore: 19,
                    totalScore: 60,
                },
                {
                    sectionType: "reading",
                    sectionName: "Đọc hiểu",
                    duration: 0,
                    passingScore: 19,
                    totalScore: 60,
                },
                {
                    sectionType: "listening",
                    sectionName: "Nghe hiểu",
                    duration: 60,
                    passingScore: 19,
                    totalScore: 60,
                },
            ],
            order: 1,
            isActive: true,
        },
    ];

    await JlptLevel.create(levels);
    console.log("✅ JLPT Levels seeded");
};

const seedCategories = async () => {
    await QuestionCategory.deleteMany();

    const categories = [
        {
            code: "kanji_reading",
            name: "Đọc chữ Hán",
            nameJp: "漢字読み",
            sectionType: "language_knowledge",
            order: 1,
        },
        {
            code: "kanji_writing",
            name: "Viết chữ Hán",
            nameJp: "表記",
            sectionType: "language_knowledge",
            order: 2,
        },
        {
            code: "vocab_meaning",
            name: "Nghĩa từ vựng",
            nameJp: "語彙の意味",
            sectionType: "language_knowledge",
            order: 3,
        },
        {
            code: "vocab_usage",
            name: "Cách dùng từ",
            nameJp: "語彙の使い方",
            sectionType: "language_knowledge",
            order: 4,
        },
        {
            code: "grammar_form",
            name: "Ngữ pháp - Dạng câu",
            nameJp: "文法形式",
            sectionType: "language_knowledge",
            order: 5,
        },
        {
            code: "grammar_arrange",
            name: "Ngữ pháp - Sắp xếp câu",
            nameJp: "文の組み立て",
            sectionType: "language_knowledge",
            order: 6,
        },
        {
            code: "reading_short",
            name: "Đọc hiểu - Nội dung ngắn",
            nameJp: "短文",
            sectionType: "reading",
            order: 7,
        },
        {
            code: "reading_medium",
            name: "Đọc hiểu - Nội dung trung bình",
            nameJp: "中文",
            sectionType: "reading",
            order: 8,
        },
        {
            code: "reading_long",
            name: "Đọc hiểu - Nội dung dài",
            nameJp: "長文",
            sectionType: "reading",
            order: 9,
        },
        {
            code: "listening_task",
            name: "Nghe hiểu - Hiểu nhiệm vụ",
            nameJp: "課題理解",
            sectionType: "listening",
            order: 10,
        },
        {
            code: "listening_point",
            name: "Nghe hiểu - Hiểu điểm chính",
            nameJp: "ポイント理解",
            sectionType: "listening",
            order: 11,
        },
        {
            code: "listening_general",
            name: "Nghe hiểu - Hiểu tổng quát",
            nameJp: "概要理解",
            sectionType: "listening",
            order: 12,
        },
    ];

    await QuestionCategory.create(categories);
    console.log("✅ Categories seeded");
};

const seedGrammarTopics = async () => {
    await GrammarTopic.deleteMany();

    const n5Level = await JlptLevel.findOne({ level: "N5" });

    const topics = [
        {
            jlptLevel: n5Level._id,
            topicCode: "N5_GRAMMAR_01",
            topicName: "Thể ます",
            topicNameJp: "ます形",
            pattern: "Vます",
            explanation: "Thể lịch sự của động từ",
            examples: ["食べます", "行きます", "見ます"],
            order: 1,
        },
        {
            jlptLevel: n5Level._id,
            topicCode: "N5_GRAMMAR_02",
            topicName: "Thể て",
            topicNameJp: "て形",
            pattern: "Vて",
            explanation: "Thể nối động từ",
            examples: ["食べて", "行って", "見て"],
            order: 2,
        },
    ];

    await GrammarTopic.create(topics);
    console.log("✅ Grammar Topics seeded");
};

const seedAll = async () => {
    try {
        await connectDB();

        console.log("🌱 Starting seed...");

        await seedUsers();
        await seedJlptLevels();
        await seedCategories();
        await seedGrammarTopics();

        console.log("✅ All data seeded successfully!");
        console.log("\n📋 Sample accounts:");
        console.log("Admin: admin@jlpt.com / admin123");
        console.log("Teacher: teacher@jlpt.com / teacher123");
        console.log("User: user@jlpt.com / user123");

        process.exit(0);
    } catch (error) {
        console.error("❌ Seed error:", error);
        process.exit(1);
    }
};

seedAll();
