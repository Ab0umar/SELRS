self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let title = "Notification";
  let options = {
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "selrs-push",
  };

  try {
    const data = event.data.json();
    title = data.notification?.title || title;
    options = {
      ...options,
      body: data.notification?.body || "",
      data: data.data || {},
    };
  } catch {
    options.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const path = event.notification.data?.path;
  if (path && typeof path === "string") {
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.endsWith(path) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(path);
        }
      })
    );
  }
});
