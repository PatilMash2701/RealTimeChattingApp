# How Real-Time Messaging Works — Simple and Practical

This document explains your chat app in very simple steps.
The goal is to show exactly how messages are saved, how users are tracked, and how live updates are sent.

---

## 1. Two kinds of traffic in the app

There are two main ways the app talks to the server:

1. HTTP requests.
   * Used for loading chat history and saving messages.
   * These are normal web calls like `POST /api/v1/message`.

2. WebSocket connections.
   * Used for live updates like "new message" or "typing...".
   * This connection stays open while the user is on the app.

Both use the same backend program and the same port.

---

## 2. How the app knows who is online

The backend keeps a small in-memory table called `userSocketMap`.

```ts
const userSocketMap: Record<string, string> = {};
```

This table stores:
* key = user ID from MongoDB
* value = socket ID from Socket.IO

When the browser connects, it sends its user ID.
Then the server saves that mapping:

```ts
userSocketMap[userId] = socket.id;
```

That means the server now knows:
* user `A` is connected on socket `abc-123`
* user `B` is connected on socket `xyz-789`

When a user closes the app, the server removes the mapping:

```ts
delete userSocketMap[userId];
```

So `userSocketMap` is the internal store of who is currently online.

---

## 3. How messages are stored in the database

When user A sends a message to user B, the frontend sends an HTTP POST request.
This request reaches `backend/chat/src/controllers/chat.ts`.

The controller does this:

1. Check the chat exists.
2. Build a new message object.
3. Save it to MongoDB.

Example:

```ts
const message = new Messages({
  chatId: new Types.ObjectId(chatId),
  sender: new Types.ObjectId(senderId),
  text,
});
const savedMessage = await message.save();
```

That means the message is now stored safely on disk in the database.

Even if the receiver is not online, the message remains saved.

---

## 4. How the message is sent instantly

Right after saving the message, the server checks if the receiver is online.
It does that by looking in `userSocketMap`.

```ts
const receiverSocketId = getReceiverSocketId(otherUserId.toString());

if (receiverSocketId) {
  io.to(receiverSocketId).emit("newMessage", savedMessage);
}
```

If the receiver has a socket ID, the server sends the event immediately.

If the receiver is offline, nothing is sent now.
But the message is still in MongoDB and can be loaded later.

---

## 5. What the browser does when it receives a message

The frontend listens for the `newMessage` event.
When it receives one, it updates the chat screen.

```tsx
socket?.on("newMessage", (newMessage) => {
  if (newMessage.chatId === selectedUser) {
    setMessages((prev) => [...prev, newMessage]);
  }
});
```

That is how the message appears instantly without refreshing.

---

## 6. How HTTP and WebSocket run together

Your app uses one server program for both.
The code does this:

```ts
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
```

So:
* `app` handles HTTP routes.
* `server` is the actual web server.
* `io` handles WebSockets.

A normal browser request is handled by Express.
A WebSocket upgrade request is handled by Socket.IO.

This is why your HTTP controller can still use `io.to(...)`.
The WebSocket engine is in the same program.

---

## 7. How current users are stored internally

The only place current online users are stored is in memory.
That means:
* `userSocketMap` lives only while the server runs.
* If the server restarts, the map is cleared.
* Users must reconnect to rebuild the map.

This is not permanent storage. It is only for live status.

---

## 8. What happens when a user is offline?

If the receiver is not online:
* `userSocketMap` has no socket ID for them.
* The server does not send a live event.
* The message is still in MongoDB.
* When they open the app later, the frontend loads the message by HTTP.

So the system is reliable:
* online delivery when possible,
* persistent storage always.

---

## 9. Step-by-step example

1. User A opens the app and connects.
   * Server stores `A -> socket123`.
2. User B opens the app and connects.
   * Server stores `B -> socket456`.
3. A sends "Hi" to B.
4. Server saves "Hi" to MongoDB.
5. Server looks up B in `userSocketMap`.
6. Server finds `socket456`.
7. Server emits `newMessage` to `socket456`.
8. B's browser receives it and shows the message immediately.

If B was offline at step 6, the message would still be saved and delivered later when B reconnects.

---

## 10. The main rules to remember

* `userSocketMap` stores who is online right now.
* Messages are saved to MongoDB first.
* WebSocket is only for live delivery.
* HTTP is for saving and loading history.
* Both run in the same server process.

This is how your chat system works from the inside.
