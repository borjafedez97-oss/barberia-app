self.addEventListener("push", function (event) {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "/logo.png",
    badge: "/logo.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/admin"
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "JBarbers Piornal", options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/admin") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/admin");
      }
    })
  );
});