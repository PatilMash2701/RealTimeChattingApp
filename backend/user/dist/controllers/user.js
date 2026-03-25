import { publishToQueue } from '../config/rabbitmq.js';
import TryCatch from '../config/TryCatch.js';
import { redisClient } from '../index.js';
import { User } from '../model/User.js';
import { generateToken } from '../config/generateToken.js';
export const loginUser = TryCatch(async (req, res) => {
    const { email } = req.body;
    const rateLimitKey = `otp:ratelimit:${email}`;
    const rateLimit = await redisClient.get(rateLimitKey);
    if (rateLimit) {
        res.status(429).json({
            message: "Too many requests. Please wait before requesting new otp",
        });
        return;
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:${email}`;
    //below is for the OTP is valid for 5 minutes
    await redisClient.set(otpKey, otp, {
        EX: 300
    });
    await redisClient.set(rateLimitKey, "true", {
        EX: 60
    });
    const message = {
        to: email,
        subject: "your OTP code",
        body: `Your OTP code is ${otp}. It is valid 5 minutes.`
    };
    await publishToQueue("send-otp", message);
    res.status(200).json({
        message: "OTP is sent to your mail"
    });
});
export const verifyUser = TryCatch(async (require, res) => {
    const { email, otp: enteredOtp } = require.body;
    if (!email || !enteredOtp) {
        res.status(400).json({
            message: "Email and OTP Required",
        });
        return;
    }
    const otpKey = `otp:${email}`;
    const storedOtp = await redisClient.get(otpKey);
    if (!storedOtp || storedOtp !== enteredOtp) {
        res.status(400).json({
            message: "Invalid or expired OTP"
        });
        return;
    }
    await redisClient.del(otpKey);
    let user = await User.findOne({ email });
    if (!user) {
        const name = email.slice(0, 8);
        user = await User.create({ name, email });
    }
    const token = generateToken(user);
    res.json({
        message: "User verified successfully",
        user,
        token,
    });
});
export const myProfile = TryCatch(async (req, res) => {
    const user = req.user;
    res.json(user);
});
export const updateName = TryCatch(async (req, res) => {
    const user = await User.findById(req.user?._id);
    if (!user) {
        res.status(404).json({
            message: "Please Login",
        });
        return;
    }
    user.name = req.body.name;
    await user.save();
    const token = generateToken(user);
    res.json({
        message: "Name updated Successfully",
        user,
        token
    });
});
export const getAllUsers = TryCatch(async (req, res) => {
    const users = await User.find();
    res.json(users);
});
export const getAUser = TryCatch(async (req, res) => {
    const user = await User.findById(req.params.id);
    res.json(user);
});
//# sourceMappingURL=user.js.map