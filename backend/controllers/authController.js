const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { redisClient } = require("../config/redis");
const { createTestTransporter, nodemailer } = require("../config/email");
const googleClient = require("../config/google");

const isProduction = process.env.NODE_ENV === "production";
const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const backendUrl = (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "");
const refreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
};

const googleCallback = async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({
                message: "Google authorization code missing"
            });
        }

        const { tokens } = await googleClient.getToken(code);

        googleClient.setCredentials(tokens);

        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        const {
            sub: googleId,
            email,
            name
        } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                name,
                email,
                googleId,
                emailVerified: true
            });
        }
        if (!user.googleId) {
            if (!user.emailVerified) {
                return res.status(403).json({
                    message: "Please verify your email before linking Google account"
                });
            }

            user.googleId = googleId;

            await user.save();
        }

        const accessToken = jwt.sign(
            {
                userId: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "15m"
            }
        ); const jti = crypto.randomUUID();
        const familyId = crypto.randomUUID();
        const refreshToken = jwt.sign(
            {
                userId: user._id,
                role: user.role,
                familyId
            },
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn: "7d",
                jwtid: jti
            }
        );
        await redisClient.set(
            `refresh:${jti}`,
            JSON.stringify({
                userId: user._id.toString(),
                role: user.role,
                familyId,
                status: "active"
            }),
            {
                EX: 7 * 24 * 60 * 60
            }
        ); await redisClient.sAdd(
            `user:sessions:${user._id.toString()}`,
            jti
        );
        await redisClient.set(`family:${familyId}`, "active", { EX: 7 * 24 * 60 * 60 });
        res.cookie("refreshToken", refreshToken, refreshCookieOptions);
        return res.redirect(`${frontendUrl}/login?google=success`);

    } catch (error) {
        console.error("Google OAuth error:", error);
        return res.redirect(`${frontendUrl}/login?google=error`);
    }
};

const googleLogin = (req, res) => {
    const authUrl = googleClient.generateAuthUrl({
        access_type: "offline",
        scope: [
            "openid",
            "email",
            "profile"
        ],
        prompt: "select_account"
    });

    res.redirect(authUrl);
};

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const verificationToken = crypto.randomBytes(32).toString("hex");

        const hashedVerificationToken = crypto
            .createHash("sha256")
            .update(verificationToken)
            .digest("hex");

        const verificationExpires = new Date(
            Date.now() + 15 * 60 * 1000
        );

        await User.create({
            name,
            email,
            password: hashedPassword,
            role: "user",
            emailVerified: false,
            emailVerificationToken: hashedVerificationToken,
            emailVerificationExpires: verificationExpires
        });

        const verificationUrl =
            `${backendUrl}/api/auth/verify-email?token=${verificationToken}`;

        const transporter = await createTestTransporter();

        const info = await transporter.sendMail({
            from: '"MERN Auth App" <no-reply@mern-auth.local>',
            to: email,
            subject: "Verify your email",
            text:
                `Welcome ${name}!\n\n` +
                `Please verify your email by opening this link:\n\n` +
                `${verificationUrl}\n\n` +
                `This link expires in 15 minutes.`,
            html: `
                <h2>Welcome ${name}!</h2>
                <p>Please verify your email address.</p>

                <p>
                    <a href="${verificationUrl}">
                        Verify Email
                    </a>
                </p>

                <p>This link expires in 15 minutes.</p>
            `
        });

        console.log(
            "Email preview URL:",
            nodemailer.getTestMessageUrl(info)
        );

        res.status(201).json({
            message: "User registered successfully"
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.redirect(`${frontendUrl}/verify-email?status=error`);
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: {
                $gt: new Date()
            }
        });

        if (!user) {
            return res.redirect(`${frontendUrl}/verify-email?status=error`);
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;

        await user.save();

        return res.redirect(`${frontendUrl}/verify-email?status=success`);
    } catch (error) {
        console.error(error);
        return res.redirect(`${frontendUrl}/verify-email?status=error`);
    }
};
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({
                message: "If an account exists, a password reset link has been sent"
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");

        const hashedResetToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        const resetExpires = new Date(
            Date.now() + 15 * 60 * 1000
        );

        user.passwordResetToken = hashedResetToken;
        user.passwordResetExpires = resetExpires;

        await user.save();

        console.log("RESET TOKEN HASH:", hashedResetToken);
        console.log("RESET EXPIRY:", resetExpires);

        const resetUrl =
            `${frontendUrl}/reset-password?token=${resetToken}`;

        console.log("PASSWORD RESET URL:", resetUrl);

        return res.status(200).json({
            message: "If an account exists, a password reset link has been sent"
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                message: "Token and new password are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: {
                $gt: new Date()
            }
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid or expired password reset token"
            });
        }

        user.password = await bcrypt.hash(newPassword, 10);

        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;

        await user.save();
        const sessionKey = `user:sessions:${user._id.toString()}`;

        const sessionJtis = await redisClient.sMembers(sessionKey);

        for (const jti of sessionJtis) {
            const refreshKey = `refresh:${jti}`;

            const sessionData = await redisClient.get(refreshKey);

            if (!sessionData) {
                continue;
            }

            const session = JSON.parse(sessionData);
            await redisClient.set(
                `family:${session.familyId}`,
                "revoked",
                {
                    EX: 7 * 24 * 60 * 60
                }
            );
            await redisClient.set(
                refreshKey,
                JSON.stringify({
                    ...session,
                    status: "revoked"
                }),
                {
                    EX: 7 * 24 * 60 * 60
                }
            );
        }

        await redisClient.del(sessionKey);
        return res.status(200).json({
            message: "Password reset successfully"
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};
const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (user.emailVerified) {
            return res.status(400).json({
                message: "Email is already verified"
            });
        }

        const verificationToken = crypto.randomBytes(32).toString("hex");

        const hashedVerificationToken = crypto
            .createHash("sha256")
            .update(verificationToken)
            .digest("hex");

        const verificationExpires = new Date(
            Date.now() + 15 * 60 * 1000
        );

        user.emailVerificationToken = hashedVerificationToken;
        user.emailVerificationExpires = verificationExpires;

        await user.save();

        const verificationUrl =
            `${backendUrl}/api/auth/verify-email?token=${verificationToken}`;

        const transporter = await createTestTransporter();

        const info = await transporter.sendMail({
            from: '"MERN Auth App" <no-reply@mern-auth.local>',
            to: user.email,
            subject: "Verify your email",
            text:
                `Please verify your email by opening this link:\n\n` +
                `${verificationUrl}\n\n` +
                `This link expires in 15 minutes.`,
            html: `
                <h2>Verify your email</h2>

                <p>Please verify your email address.</p>

                <p>
                    <a href="${verificationUrl}">
                        Verify Email
                    </a>
                </p>

                <p>This link expires in 15 minutes.</p>
            `
        });

        console.log(
            "Email preview URL:",
            nodemailer.getTestMessageUrl(info)
        );

        res.status(200).json({
            message: "Verification email sent"
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};
const loginUser = async (req, res) => {
    console.log("LOGIN ROUTE HIT");

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        if (!user.emailVerified) {
            return res.status(403).json({
                message: "Please verify your email before logging in"
            });
        }

        const accessToken = jwt.sign(
            {
                userId: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "15m"
            }
        );

        const familyId = crypto.randomUUID();

        await redisClient.set(
            `family:${familyId}`,
            "active",
            {
                EX: 7 * 24 * 60 * 60
            }
        );

        const refreshToken = jwt.sign(
            {
                userId: user._id,
                role: user.role,
                familyId
            },
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn: "7d",
                jwtid: crypto.randomUUID()
            }
        );

        const decodedRefreshToken = jwt.decode(refreshToken);

        await redisClient.sAdd(
            `user:sessions:${user._id.toString()}`,
            decodedRefreshToken.jti
        );

        await redisClient.set(
            `refresh:${decodedRefreshToken.jti}`,
            JSON.stringify({
                userId: user._id.toString(),
                role: user.role,
                familyId,
                status: "active"
            }),
            {
                EX: 7 * 24 * 60 * 60
            }
        );

        res.cookie("refreshToken", refreshToken, refreshCookieOptions);

        res.status(200).json({
            message: "Login successful",
            accessToken
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

const refreshAccessToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                message: "Refresh token required"
            });
        }

        const decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const redisSession = await redisClient.get(
            `refresh:${decoded.jti}`
        );

        if (!redisSession) {
            return res.status(401).json({
                message: "Refresh token revoked or invalid"
            });
        }

        const session = JSON.parse(redisSession);

        if (session.status === "revoked") {
            await redisClient.set(
                `family:${session.familyId}`,
                "revoked",
                {
                    EX: 7 * 24 * 60 * 60
                }
            );

            return res.status(401).json({
                message: "Refresh token reuse detected"
            });
        }

        const familyStatus = await redisClient.get(
            `family:${session.familyId}`
        );

        if (familyStatus !== "active") {
            return res.status(401).json({
                message: "Refresh token family revoked"
            });
        }

        const accessToken = jwt.sign(
            {
                userId: decoded.userId,
                role: decoded.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "15m"
            }
        );

        const newRefreshToken = jwt.sign(
            {
                userId: decoded.userId,
                role: decoded.role,
                familyId: decoded.familyId
            },
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn: "7d",
                jwtid: crypto.randomUUID()
            }
        );

        const decodedNewRefreshToken = jwt.decode(
            newRefreshToken
        );

        await redisClient.sAdd(
            `user:sessions:${decoded.userId}`,
            decodedNewRefreshToken.jti
        );
        await redisClient.sRem(
            `user:sessions:${decoded.userId}`,
            decoded.jti
        );
        await redisClient.set(
            `refresh:${decodedNewRefreshToken.jti}`,
            JSON.stringify({
                userId: decoded.userId,
                role: decoded.role,
                familyId: decoded.familyId,
                status: "active"
            }),
            {
                EX: 7 * 24 * 60 * 60
            }
        );

        await redisClient.set(
            `refresh:${decoded.jti}`,
            JSON.stringify({
                userId: decoded.userId,
                role: decoded.role,
                familyId: decoded.familyId,
                status: "revoked"
            }),
            {
                EX: 7 * 24 * 60 * 60
            }
        );

        res.cookie("refreshToken", newRefreshToken, refreshCookieOptions);

        res.status(200).json({
            accessToken
        });
    } catch (error) {
        res.status(401).json({
            message: "Invalid or expired refresh token"
        });
    }
};

const logoutUser = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(200).json({
                message: "Already logged out"
            });
        }

        const decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        await redisClient.set(
            `refresh:${decoded.jti}`,
            JSON.stringify({
                userId: decoded.userId,
                role: decoded.role,
                familyId: decoded.familyId,
                status: "revoked"
            }),
            {
                EX: 7 * 24 * 60 * 60
            }
        );

        await redisClient.set(
            `family:${decoded.familyId}`,
            "revoked",
            {
                EX: 7 * 24 * 60 * 60
            }
        );

        res.clearCookie("refreshToken", refreshCookieOptions);

        return res.status(200).json({
            message: "Logout successful"
        });
    } catch (error) {
        res.clearCookie("refreshToken", refreshCookieOptions);

        return res.status(200).json({
            message: "Logout successful"
        });
    }
};

module.exports = {
    registerUser,
    verifyEmail,
    loginUser,
    refreshAccessToken,
    logoutUser,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
    googleLogin,
    googleCallback,
};
