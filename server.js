import "dotenv/config";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import Logger from "./src/utils/logger.js";

const PORT = process.env.PORT || 5000;

connectDB();

const server = app.listen(PORT, () => {
    Logger.success(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
    Logger.error("UNHANDLED REJECTION! Shutting down...", err);
    server.close(() => {
        process.exit(1);
    });
});

process.on("uncaughtException", (err) => {
    Logger.error("UNCAUGHT EXCEPTION! Shutting down...", err);
    process.exit(1);
});
