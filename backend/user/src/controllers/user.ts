import { publishToQueue } from '../config/rabbitmq.js';
import TryCatch from '../config/TryCatch.js';
import { redisClient } from '../index.js';
import { User } from '../model/User.js';
import { generateToken } from '../config/generateToken.js';
import { AuthenticatedRequest } from '../middleware/isAuth.js';
import cloudinary from '../config/cloudinary.js';
import { getCache, setCache, delCache } from '../config/cache.js';

export const loginUser = TryCatch(async(req ,res)=>{
        const {email} = req.body;

        // Create a Redis key for this email to prevent OTP spam or repeated requests.
        // If the key already exists, it means the user has requested an OTP recently
        // and must wait before requesting another one.
        const rateLimitKey = `otp:ratelimit:${email}`;
        const rateLimit = await redisClient.get(rateLimitKey);
        if(rateLimit){
            res.status(429).json({
                message:"Too many requests. Please wait before requesting new otp",
            });
            return;
        }

        const otp = Math.floor(100000 + Math.random()*900000).toString();

        const otpKey = `otp:${email}`;

        //below is for the OTP is valid for 5 minutesate
        await redisClient.set(otpKey, otp, {
            EX: 300
        })

        //The key is set earlier with a 60-second expiration using EX: 60, so the same email cannot request another OTP again for about 1 minute.
        await redisClient.set(rateLimitKey, "true",{
            EX: 60
        })

        const message = {
            to: email,
            subject: "your OTP code",
            body: `Your OTP code is ${otp}. It is valid 5 minutes.`
        };

        await publishToQueue("send-otp", message) //if the sent-otp queue is not present then it creates it automatically

        res.status(200).json({
            message:"OTP is sent to your mail"
        })
})

export const verifyUser = TryCatch(async(require,res) => {
    const {email, otp:enteredOtp} = require.body;

    if(!email || !enteredOtp){
        res.status(400).json({
            message:"Email and OTP Required",
        })
        return;
    }

    const otpKey = `otp:${email}`;
    const storedOtp = await redisClient.get(otpKey);

    if(!storedOtp || storedOtp !== enteredOtp){
        res.status(400).json({
            message:"Invalid or expired OTP"
        })
        return;
    }

    await redisClient.del(otpKey);

    let user = await User.findOne({email})

    if(!user){
        const name = email.slice(0,8)
        user = await User.create({name, email});
        // New user created — invalidate user list cache
        await delCache('users:list').catch(()=>{});
    }

    const token = generateToken(user);

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }).json({
        message:"User verified successfully",
        user,
        token,
    });
});

export const logoutUser = TryCatch(async(req, res) => {
    res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0),
    }).json({
        message: "Logged out successfully"
    });
});

// the request object is being typed as AuthenticatedRequest
export const myProfile = TryCatch(async(req: AuthenticatedRequest, res) => {
    const userId = req.user?._id?.toString();
    const cacheKey = `user:${userId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
        res.json(cached);
        return;
    }
    const user = await User.findById(userId).select("-pushSubscriptions");
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    await setCache(cacheKey, user, 120);
    res.json(user);
});

export const updateName = TryCatch(async(req:AuthenticatedRequest, res) => {

    const user = await User.findById(req.user?._id);

    if(!user){
        res.status(404).json({
           message: "Please Login",
        })
        return;
    }
    user.name = req.body.name;

    await user.save();
    const token = generateToken(user);
    // Invalidate caches for this user
    await delCache(`user:${user._id}`).catch(()=>{});
    await delCache('users:list').catch(()=>{});

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    }).json({
        message:"Name updated Successfully",
        user,
        token
    })
})

export const getAllUsers = TryCatch(async(req:AuthenticatedRequest, res)=>{
    const cacheKey = 'users:list';
    const cached = await getCache(cacheKey);
    if (cached) {
        console.log('Returning cached users list');
        res.json(cached);
        return;
    }
    const users = await User.find().select("-pushSubscriptions");
    // Only cache if we have users
    if (users.length > 0) {
        await setCache(cacheKey, users, 60);
    }
    res.json(users);
})

export const getAUser = TryCatch(async(req, res) => {
    const userId = req.params.id;
    const cacheKey = `user:${userId}`;
    
    // Try to get from cache first
    const cached = await getCache(cacheKey);
    if (cached) {
        res.json(cached);
        return;
    }
    
    // Fetch from DB
    // include all fields except pushSubscriptions
    const user = await User.findById(userId).select("-pushSubscriptions");
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    
    // Cache valid user data for 2 minutes
    await setCache(cacheKey, user, 120);
    res.json(user);
});

export const updateProfilePic = TryCatch(async(req: AuthenticatedRequest, res) => {
    const user = await User.findById(req.user?._id);

    if(!user){
        res.status(404).json({
            message:"User not found"
        });
        return;
    }

    const file = req.file;

    if(!file){
        res.status(400).json({
            message:"No file uploaded"
        });
        return;
    }

    // If user already has a profile pic, delete the old one from Cloudinary
    if(user.profilePic && user.profilePic.publicId){
        await cloudinary.uploader.destroy(user.profilePic.publicId);
    }

    user.profilePic = {
        url: file.path,
        publicId: file.filename,
    };

    await user.save();

    const token = generateToken(user);

    // Invalidate caches for this user
    await delCache(`user:${user._id}`).catch(()=>{});
    await delCache('users:list').catch(()=>{});

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    }).json({
        message: "Profile picture updated successfully",
        user,
        token,
    });
});

//this code handles the browser push notifications for the logged-in user.
//the app stores a Web Push subscription object from the frontend(browser) in the mongoDB user document.Later, the backend can use that subscription to send push notifications to the user even when the app is not open
//This is imp for :
//1.notifying users about messages
//2.sending OTP or alerts
//3.sending offline notifications in a real-time app 

export const savePushSubscription = TryCatch(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    //the fronted sends a subscription object through the request body, which contains the endpoint and keys needed to send push notifications to that specific browser instance.
    const { subscription } = req.body as { subscription?: any };
    if (!subscription?.endpoint) {
        res.status(400).json({ message: "Invalid subscription" });
        return;
    }

    const user = await User.findById(userId);
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    user.pushSubscriptions = user.pushSubscriptions || [];

    const endpoint = subscription.endpoint;
    const updatedKeys = subscription.keys || {};
    const expirationTime = subscription.expirationTime || null;

    //This object is cleaned and standardized before saving ,This keeps only the necessary push keys and avoids bad data.
    const normalized = {
        endpoint,
        keys: {
            p256dh: updatedKeys.p256dh,
            auth: updatedKeys.auth,
        },
        expirationTime,
    };

    // This checks whether the browser already has a saved subscription with the same endpoint.
    // If yes, it updates the existing one
    // If no, it adds a new one
    // This prevents duplicate subscriptions.
    const existingIndex = user.pushSubscriptions.findIndex((s: any) => s.endpoint === endpoint);
    if (existingIndex >= 0) {
        user.pushSubscriptions[existingIndex] = normalized as any;
    } else {
        user.pushSubscriptions.push(normalized as any);
    }

    await user.save();
    res.json({ success: true });
});

export const getPushSubscriptionByUserId = TryCatch(async (req, res) => {
    const { userId } = req.params as { userId: string };
    if (!userId) {
        res.status(400).json({ message: "userId is required" });
        return;
    }

    const user = await User.findById(userId);
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    res.json({ subscription: user.pushSubscriptions?.[0] || null });
});