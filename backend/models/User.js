const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true,
            unique: true
        },

        password: {
            type: String,
            // OAuth accounts do not have a local password.
            required: function () {
                return !this.googleId;
            }
        },

        role: {
            type: String,
            enum: ["user", "moderator", "admin"],
            default: "user"
        },

        emailVerified: {
            type: Boolean,
            default: false
        },

        emailVerificationToken: {
            type: String
        },

        emailVerificationExpires: {
            type: Date
        },
        passwordResetToken: {
            type: String
        },
        passwordResetExpires: {
            type: Date
        }, googleId: {
            type: String,
            unique: true,
            sparse: true
        },
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
