import express from "express";
import { loginUser, verifyUser, myProfile, getAllUsers, getAUser, updateName, logoutUser, updateProfilePic, savePushSubscription, getPushSubscriptionByUserId } from "../controllers/user.js";
import { isAuth } from "../middleware/isAuth.js";
import { upload } from "../middleware/multer.js";
const router = express.Router();
router.post("/login", loginUser);
router.post("/verify", verifyUser);
router.post("/user/register", verifyUser); // Alias for register
router.post("/logout", isAuth, logoutUser);
router.get("/me", isAuth, myProfile);
router.get("/user/all", isAuth, getAllUsers);
router.get("/user/:id", getAUser);
router.post("/update/user", isAuth, updateName);
router.post("/update/profile-pic", isAuth, upload.single("image"), updateProfilePic);
// Web Push: store subscription in user model (for chat service to notify offline users)
router.post("/user/push/subscribe", isAuth, savePushSubscription);
router.get("/user/push-subscription/:userId", getPushSubscriptionByUserId);
export default router;
//# sourceMappingURL=user.js.map