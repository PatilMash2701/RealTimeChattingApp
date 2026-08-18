import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const isImage = file.mimetype?.startsWith("image/");
        if (isImage) {
            return {
                folder: "chat-images",
                allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
                transformation: [
                    { width: 800, height: 600, crop: "limit" },
                    { quality: "auto" },
                ],
            };
        }
        return {
            folder: "chat-files",
            resource_type: "raw",
            allowed_formats: ["pdf", "doc", "docx", "txt", "zip"],
        };
    },
});
export const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const isImage = file.mimetype?.startsWith("image/");
        if (isImage) {
            cb(null, true);
            return;
        }
        const allowedNonImageMimetypes = new Set([
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "application/zip",
            "application/x-zip-compressed",
        ]);
        if (allowedNonImageMimetypes.has(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error("Unsupported file type"));
    }
});
//# sourceMappingURL=multer.js.map