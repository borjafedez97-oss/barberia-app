import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabase } from "@/lib/supabase";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:contacto@jbarbers.es",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    const { title, body } = await req.json();

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_type", "barber");

    if (error || !subs || subs.length === 0) {
      return NextResponse.json({ message: "No hay dispositivos registrados" });
    }

    const payload = JSON.stringify({
      title: title || "💈 ¡Nueva Cita Confirmada!",
      body: body || "Tienes una nueva cita en la agenda.",
      url: "/admin",
      timestamp: Date.now()
    });

    // Opciones forzadas para FCM (Android) y APNs (Apple)
    const pushOptions: webpush.RequestOptions = {
      TTL: 0, // Entrega inmediata obligatoria: si el móvil está suspendido, fuerza el despertar
      urgency: "high",
      headers: {
        Urgency: "high",
        Topic: "appointments"
      }
    };

    const sendPromises = subs.map((s: any) =>
      webpush.sendNotification(s.subscription, payload, pushOptions).catch((err) => {
        console.error("Error enviando push a dispositivo:", err);
      })
    );

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error general en send-push:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}