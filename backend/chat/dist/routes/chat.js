import express from 'express';
import { createNewChat, getAllChats, sendMessage, getMessagesByChat, getMessagesBetweenUsers, createGroupChat, renameGroup, addToGroup, removeFromGroup, reactToMessage, deleteMessage, searchMessages, } from '../controllers/chat.js';
import { isAuth } from '../middlewares/isAuth.js';
import { upload } from '../middlewares/multer.js';
const router = express.Router();
// One-to-one Chat Routes
router.post("/chat/new", isAuth, (req, res, next) => { console.log("POST /chat/new hit"); next(); }, createNewChat);
router.get("/chat/:userId", isAuth, (req, res, next) => { console.log("GET /chat/:userId hit", req.params.userId); next(); }, getAllChats);
router.get("/message/:userId/:receiverId", isAuth, (req, res, next) => { console.log("GET /message/:userId/:receiverId hit", req.params); next(); }, getMessagesBetweenUsers);
// Unified Message Sending (REST fallback for images/files)
router.post("/message", isAuth, (req, res, next) => { console.log("POST /message hit"); next(); }, upload.single("image"), sendMessage);
// Unified Chat Message Route (Works for both Group and 1-to-1)
router.get("/:chatId/message", isAuth, (req, res, next) => { console.log(`GET /${req.params.chatId}/message hit`); next(); }, getMessagesByChat);
// Group Chat Routes
router.post("/groups/create", isAuth, createGroupChat);
router.post("/groups/:groupId/add", isAuth, addToGroup);
router.post("/groups/:groupId/remove", isAuth, removeFromGroup);
router.put("/groups/:groupId/rename", isAuth, renameGroup);
// Message features
router.post("/message/reaction", isAuth, reactToMessage);
router.delete("/message/:messageId", isAuth, deleteMessage);
router.get("/message/search", isAuth, searchMessages);
export default router;
//# sourceMappingURL=chat.js.map