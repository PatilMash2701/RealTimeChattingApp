import multer from "multer";
import {CloudinaryStorage} from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";


const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req: any, file: any) => {
        const isImage = file.mimetype?.startsWith("image/");

        if (isImage) {
            return {
                folder: "chat-images",
                allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
                transformation: [
                    { width: 800, height: 600, crop: "limit" },
                    { quality: "auto" },
                ],
            } as any;
        }

        return {
            folder: "chat-files",
            resource_type: "raw",
            allowed_formats: ["pdf", "doc", "docx", "txt", "zip"],
        } as any;
    },
} as any);

// cb : is the multer-provided callback in the fileFilter(signature: (req,file,cb)).   PURPOSE: tell multer whether to accept or reject the incoming file(or report an error)
//cb(null, true)-accept the file  , cb(null, false)-reject the file  , cb(new Error("Unsupported file type"))-reject the file and report an error
//this implements server-side validation via the multer API so only permitted file types are uploaded. 

export const upload = multer({
    storage,
    limits:{
        fileSize: 5*1024*1024, 
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
})

