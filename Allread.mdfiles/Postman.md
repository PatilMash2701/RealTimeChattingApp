# WhatsApp Clone - Postman API Documentation

This document provides a detailed breakdown of all backend API endpoints for the **User Service** (Port 5000) and **Chat Service** (Port 5002). 

> [!IMPORTANT]
> Since the application uses **HttpOnly Cookies**, ensure that your Postman environment has `With Credentials` enabled or manually include the `token` cookie in your requests after logging in.

---

## 1. User Service (Port 5000)
**Base URL**: `http://localhost:5000/v1`

### Authentication & Profile
| Endpoint | Method | Body (JSON) | Description |
| :--- | :--- | :--- | :--- |
| `/login` | `POST` | `{ "email": "user@example.com" }` | Sends a 6-digit OTP to the user's email. |
| `/verify` | `POST` | `{ "email": "...", "otp": "123456" }` | Verifies OTP and sets a secure `token` cookie. |
| `/user/register` | `POST` | `{ "email": "...", "otp": "..." }` | Alias for `/verify`. Creates a new account if one doesn't exist. |
| `/me` | `GET` | N/A | Returns the currently logged-in user's profile. (Requires Auth) |
| `/logout` | `POST` | N/A | Clears the `token` cookie and ends the session. (Requires Auth) |

### User Management
| Endpoint | Method | Body (JSON) | Description |
| :--- | :--- | :--- | :--- |
| `/user/all` | `GET` | N/A | Returns a list of all registered users. (Requires Auth) |
| `/user/:id` | `GET` | N/A | Returns details for a specific user by their ID. |
| `/update/user` | `POST` | `{ "name": "New Name" }` | Updates the logged-in user's display name. (Requires Auth) |

---

## 2. Chat Service (Port 5002)
**Base URL**: `http://localhost:5002/v1`

### 1-to-1 Chat & Messages
| Endpoint | Method | Params / Body | Description |
| :--- | :--- | :--- | :--- |
| `/chat/new` | `POST` | `{ "userId": "...", "otherUserId": "..." }` | Initializes a new 1-to-1 conversation. |
| `/chat/:userId` | `GET` | URL Param: `userId` | Lists all active chats (Private & Group) for the user. |
| `/message/:userId/:receiverId` | `GET` | Query: `?page=1&limit=30` | Fetches message history between two specific users. |
| `/message` | `POST` | `FormData`: `chatId`, `text`, `image` (file) | Sends a message. Supports text and image uploads. |

### Group Management
| Endpoint | Method | Params / Body | Description |
| :--- | :--- | :--- | :--- |
| `/groups/create` | `POST` | `{ "name": "...", "users": ["id1", "id2"] }` | Creates a new group chat with the specified members. |
| `/groups/:groupId/add` | `POST` | `{ "userIdToAdd": "..." }` | Adds a user to the group. (Admin Only) |
| `/groups/:groupId/remove` | `POST` | `{ "userIdToRemove": "..." }` | Removes a user or allows them to leave the group. |
| `/groups/:groupId/rename` | `PUT` | `{ "name": "New Group Name" }` | Renames the group. (Admin Only) |
| `/:groupId/message` | `GET` | Query: `?page=1&limit=30` | Fetches paginated message history for a group. |

---

## 3. Real-Time Communication (Socket.IO)
**Namespace**: `/` (Default)
**Base URL**: `ws://localhost:5002`

### Key Socket Events
| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `joinChat` | Client -> Server | `chatId` | Joins a specific chat room for real-time updates. |
| `send` | Client -> Server | `{ "chatId": "...", "text": "..." }` | Unified event for sending real-time messages. |
| `typing` | Client -> Server | `chatId` | Broadcasts "typing..." status to the room. |
| `stopTyping` | Client -> Server | `chatId` | Removes "typing..." status from the room. |
| `newMessage` | Server -> Client | `Message Object` | Emitted to room members when a new message is received. |

---

## Use Cases for Postman
1. **Login Flow**: Call `POST /login`, then `POST /verify` with the OTP from your email.
2. **Fetch Chats**: Call `GET /chat/{your_user_id}` to see your conversation list. 
3. **Send Message**: Use `multipart/form-data` for the `/message` endpoint if testing image uploads.
4. **Group Admin**: Use `/groups/create` followed by `/:groupId/add` to build a group.
