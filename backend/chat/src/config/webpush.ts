import webpush from "web-push";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidEmail = process.env.VAPID_EMAIL || "admin@example.com";

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        `mailto:${vapidEmail}`,
        vapidPublicKey,
        vapidPrivateKey
    );
}

export default webpush;

// overview(why use it)
// PURPOSE: web-push is a Node library for sending webpush notifications from your server to users browsers(delivered via service workers).
// WHY use it: it lets your backend push real-time notifications(messages, alerts) even when the web page isnt open

// HOW IT WORKS(HIGH-LEVEL-FLOW):
// >CLIENT : registers a service worker and calls pushManager.subscribe({applicationServerKey:<VAPID_PUBLIC_KEY>}) -> getS a subscription object(ENDPOINT + KEY ) and sends it to your server.
// >SERVER : stores that subscription and calls webpush.sendNotification(subscription, payload, options). web-push handles the encryption and HTTP request to the browser push endpoint.
// >BROWSER: the service worker receives a push event and can show a notification(via self.registration.showNotification()).


