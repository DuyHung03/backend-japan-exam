import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";

import errorHandler from "./middlewares/error.middleware.js";
import Logger from "./utils/logger.js";

import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import examAttemptRoutes from "./routes/exam-attempt.routes.js";
import examTemplateRoutes from "./routes/exam-template.routes.js";
import examRoutes from "./routes/exam.routes.js";
import grammarTopicRoutes from "./routes/grammar-topic.routes.js";
import jlptLevelRoutes from "./routes/jlpt-level.routes.js";
import publicRoutes from "./routes/public.routes.js";
import questionRoutes from "./routes/question.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

app.use(helmet());
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    }),
);

if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "JLPT API is running",
        timestamp: new Date().toISOString(),
    });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/jlpt-levels", jlptLevelRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/grammar-topics", grammarTopicRoutes);
app.use("/api/v1/questions", questionRoutes);
app.use("/api/v1/exams", examRoutes);
app.use("/api/v1/exam-attempts", examAttemptRoutes);
app.use("/api/v1/exam-templates", examTemplateRoutes);
app.use("/api/v1/public", publicRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/upload", uploadRoutes);

app.all("*", (req, res) => {
    Logger.warn(`Route not found: ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
});

app.use(errorHandler);

export default app;
