self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  let data = {
    title: "💈 ¡Nueva Cita - JBarbers!",
    body: "Tienes una nueva reserva confirmada.",
    url: "/admin"
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: "/logo.png",
    badge: "/logo.png",
    // Patrón de vibración prolongado e ininterrumpido para Android
    vibrate: [500, 250, 500, 250, 500],
    tag: "citas-jbarbers-" + Date.now(),
    renotify: true,
    requireInteraction: true, // No desaparece hasta que el usuario interactúa
    silent: false,
    data: {
      url: data.url || "/admin"
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/admin";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes("/admin") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});