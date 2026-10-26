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
      return NextResponse.json({ message: "No hay móviles registrados" });
    }

    const payload = JSON.stringify({
      title: title || "💈 Nueva Cita - JBarbers",
      body: body || "Tienes una nueva cita reservada.",
      url: "/admin"
    });

    const pushOptions = {
      TTL: 60 * 60 * 24, // 24 horas
      urgency: "high" as const,
      headers: {
        Urgency: "high"
      }
    };

    const sendPromises = subs.map((s: any) =>
      webpush.sendNotification(s.subscription, payload, pushOptions).catch((err) => {
        console.error("Error push individual:", err);
      })
    );

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error en send-push:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}