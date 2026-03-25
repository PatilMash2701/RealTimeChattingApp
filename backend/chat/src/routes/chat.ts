import express from 'express';
import { createNewChat, getAllChats ,sendMessage, getMessagesByChat} from '../controllers/chat.js';
import { isAuth } from '../middlewares/isAuth.js';
import {upload} from '../middlewares/multer.js';


const router = express.Router();

//chat means the connection between two users
router.post("/chat/new", isAuth, createNewChat);
router.get("/chat/all", isAuth, getAllChats);
router.post("/message", isAuth , upload.single("image"), sendMessage);
router.get("/message/:chatId", isAuth, getMessagesByChat);

export default router;
