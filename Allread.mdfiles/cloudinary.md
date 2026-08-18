# Cloudinary Image Handling Architecture

This document outlines the technical flow of how image messages are securely and efficiently handled via Cloudinary within the Chat backend.

## 1. The Frontend Upload
When a user selects an image, the frontend bundles the image file into a `multipart/form-data` payload and sends it via an authenticated `POST` request to the `/api/v1/message` endpoint on the Chat microservice.

## 2. The Multer Middleware Intercept
Before the request logic reaches the `sendMessage` controller, the route passes the request through the `upload.single("image")` middleware (located in `middlewares/multer.ts`). 

```typescript
// chat.ts (Routes)
router.post("/message", isAuth, upload.single("image"), sendMessage);
```

## 3. Automatically Streaming to Cloudinary
Because the storage engine is configured with `multer-storage-cloudinary`, the backend **never saves the image to its own hard drive or memory space**. 

Instead, as the backend receives chunks of the loaded image from the user, it immediately streams those chunks straight into the assigned Cloudinary `"chat-images"` directory.

Cloudinary automatically processes and applies defined transformations as it saves the image to the CDN:
- Automatically scaling the dimensions to a maximum of `800x600`.
- Applying `quality: "auto"` to compress the image efficiently without losing visual fidelity.

## 4. Controller & Database Saving
Once Cloudinary successfully finishes storing and optimizing the file, it passes the new optimized CDN URLs back into the memory of the `req.file` object. 

The `sendMessage` controller accesses this payload:
```typescript
if(imageFile){
    messageData.image = {
        url: imageFile.path, // The public Cloudinary CDN link
        publicId: imageFile.filename, // The unique Cloudinary ID
    };
    messageData.messageType = "image";
}
```
The controller then permanently saves these two lightweight strings (the URL and the ID) to the MongoDB database, instead of having to handle heavy file blob operations.

## 5. The Real-Time Socket Emission
Finally, just like regular text messages, the Socket.IO instance grabs that newly saved database object—which now safely contains the Cloudinary `url`—and beams it perfectly to the recipient's frontend! 

When the recipient's React application receives the socket event, it seamlessly renders an `<img src={message.image.url} />` tag. The recipient's browser instantly downloads the highly optimized, scaled image directly from Cloudinary's high-speed global CDN servers!
