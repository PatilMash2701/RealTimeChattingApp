# Deep Dive: `SocketContext.tsx`

This document explains the "engine room" of your Real-Time functionality. The `SocketContext` is responsible for establishing, managing, and distributing the WebSocket connection across your entire React application.

---

## 1. Imports and Types
```tsx
import { io, Socket } from "socket.io-client";
```
*   **`io`**: The function that creates the connection.
*   **`Socket`**: The TypeScript interface that tells the code what a "Socket" object looks like (it has methods like `.on`, `.emit`, and `.disconnect`).

```tsx
interface SocketContextType {
    socket: Socket | null;
    onlineUsers: string[];
}
```
*   **`socket`**: The active connection object.
*   **`onlineUsers`**: An array of `userId`s currently connected to the server.

---

## 2. The Context and Provider
The `SocketContext` acts like a "Global News Station." Any component (like your Chat page or Sidebar) can "tune in" to get the latest messages or online status without you having to pass props down manually.

---

## 3. The `useEffect` Connection Logic
This is the most critical part of your frontend. It triggers as soon as a user logs in.

```tsx
useEffect(() => {
    // 1. DONT CONNECT IF NOT LOGGED IN
    // We don't want an anonymous connection wasting server resources.
    if (!user?._id) return;

    // 2. INITIALIZE THE CONNECTION
    const newSocket = io(chat_service, {
        query: {
            userId: user._id // Passing ID so the backend knows who we are
        }
    });

    // 3. STORE IN STATE
    setSocket(newSocket);

    // 4. LISTEN FOR THE "WHO IS ONLINE" LIST
    // The server emits this every time ANYONE connects or disconnects.
    newSocket.on("getOnlineUser", (users: string[]) => {
        setOnlineUsers(users);
    });

    // 5. THE CLEANUP (VERY IMPORTANT!)
    // If the user logs out or closes the app, 
    // we tell the socket to "die" immediately.
    return () => {
        newSocket.disconnect();
    };
}, [user?._id]); // Re-run this logic only if the logged-in User ID changes
```

---

## 4. Why Use a "Context"?
If you didn't have `SocketContext.tsx`, you would have to:
1. Open a new socket connection on every single page (This would crash your server!).
2. Or, pass the `socket` variable through 10 different components manually.

**With Context**, you just write `const { socket } = SocketData();` in any file, and you get the **exact same connection** that started when you logged in.

---

## 5. Security and Maintenance
*   **CORS**: This file only works because your Backend allows `http://localhost:3000` (or whatever your frontend URL is) to connect.
*   **Query Params**: The `userId` being passed is a "cleartext" query. In a production app for a big company, you would usually pass a **JWT Token** here instead of just the `userId` for better security.
*   **Auto-Reconnection**: By default, the `io()` call handles "re-tries" if the internet cuts out.

---

## Summary Table
| Logic | Purpose |
| :--- | :--- |
| `io(chat_service)` | Connects the frontend to the backend URL. |
| `query: { userId }` | Tells the backend "I am User X". |
| `setSocket(newSocket)` | Makes the connection available to the rest of the app. |
| `newSocket.on(...)` | Listens for the central server "broadcasts." |
| `newSocket.disconnect()` | Cleans up the connection to avoid "Ghost Users" on the server. |
