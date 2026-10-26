self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "JBarbers Piornal", body: event.data.text() };
    }
  }

  const title = data.title || "💈 ¡Nueva Cita - JBarbers!";
  const options = {
    body: data.body || "Tienes una nueva cita reservada.",
    icon: "/logo.png",
    badge: "/logo.png",
    tag: "appointment-" + Date.now(),
    renotify: true,
    requireInteraction: true,
    vibrate: [400, 200, 400, 200, 600],
    data: {
      url: data.url || "/admin"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
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