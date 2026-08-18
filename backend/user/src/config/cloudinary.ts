import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// Load environment variables from the .env file so the Cloudinary credentials
// are available to this service at runtime.
dotenv.config();

// Cloudinary is a cloud-based media management platform used for storing,
// transforming, optimizing, and delivering images and videos. It provides a
// reliable way to upload files without consuming local server storage and also
// helps serve media through CDNs for faster loading.
//
// In this project, Cloudinary is used to handle profile pictures and other
// uploaded media so the application can manage files efficiently and scale
// better as usage grows.
//
// Configure the Cloudinary SDK with the credentials from environment variables.
// This is the central setup that allows the app to upload, manage, and retrieve
// media files from Cloudinary instead of storing them locally in the server.
cloudinary.config({
    cloud_name: process.env.Cloud_Name as string,
    api_key: process.env.Api_key as string,
    api_secret: process.env.Api_Secret as string,
});

// Export the configured Cloudinary instance so other modules can use it for
// image/video upload operations in a consistent way. Other parts of the app
// can import this instance and call Cloudinary APIs without repeating setup.
export default cloudinary;
