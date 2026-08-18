import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// This code is configuring file upload handling for profile images.
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req: any, file: any) => {
        return {
            folder: "profile_pics",  //when a file is uploaded, send it to Cloudinary => store it inside the folder named profile_pics
            allowed_formats: ["jpg", "png", "jpeg"],
        };
    },
});

// This creates a Multer upload middleware using the Cloudinary storage config.
export const upload = multer({ storage });

//and the uploaded file will be:

// validated by file type
// uploaded to Cloudinary
// saved under profile_pics