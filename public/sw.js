self.addEventListener("push", function (event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "JBarbers Piornal", body: event.data.text() };
    }
  }

  const options = {
    body: data.body || "Tienes una nueva cita reservada.",
    icon: "/logo.png",
    badge: "/logo.png",
    // Patrón de vibración largo para que se note en el bolsillo
    vibrate: [300, 150, 300, 150, 400],
    tag: "appointment-" + Date.now(), // Tag único para que no agrupe ni silencie
    renotify: true,
    requireInteraction: true, // Mantiene la notificación visible hasta que la pulse
    silent: false,
    data: {
      url: data.url || "/admin"
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "💈 ¡Nueva Cita - JBarbers!", options)
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