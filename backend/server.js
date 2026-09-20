require("dotenv").config();
const { connectRedis } = require("./config/redis");
const helmet = require("helmet");
const { createApiRateLimit } = require("./middleware/rateLimit");

const cookieParser = require("cookie-parser");
const cors = require("cors");
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in .env");
}

require("./config/env");
const express = require("express");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const app = express();
app.set("trust proxy", 1);

let apiRateLimit;
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://mern-auth-rbac.vercel.app"
        ],
        credentials: true
    })
);
app.use(express.json());
app.use(cookieParser());
app.use("/api", (req, res, next) => apiRateLimit(req, res, next));
app.use(helmet());

app.get("/", (req, res) => {
    res.send("Server is running");
});

app.get("/api/hello", (req, res) => {
    res.json({
        message: "Hello from backend"
    });
});

app.post("/api/users", (req, res) => {
    console.log(req.body);

    res.json({
        message: "User received",
        user: req.body
    });
});

app.use("/api/auth", authRoutes);

const startServer = async () => {
    await connectDB();
    await connectRedis();
    apiRateLimit = createApiRateLimit();

    app.listen(process.env.PORT, () => {
        console.log(`Server running on port ${process.env.PORT}`);
    });
};

if (require.main === module) {
    startServer().catch((error) => {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    });
}

module.exports = app;