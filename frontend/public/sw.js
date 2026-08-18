self.addEventListener("push", function (event) {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {};
  }

  const title = payload.title || "New message";
  const body = payload.body || "";

  const options = {
    body,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // Try to focus an existing tab first.
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }

        if (self.clients.openWindow) return self.clients.openWindow("/");
      })
  );
});

