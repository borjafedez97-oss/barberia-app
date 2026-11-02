import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:contacto@jbarbers.es",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Canal 1: Telegram (app nativa, entrega fiable con el móvil bloqueado)
async function sendTelegram(text: string): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return "telegram: sin configurar";

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    return `telegram: ${res.status}`;
  } catch (e) {
    return `telegram: error ${String(e)}`;
  }
}

// Canal 2: Web Push (el que ya tenías), ahora con logs y limpieza de suscripciones muertas
async function sendWebPush(payload: string): Promise<string[]> {
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_type", "barber");

  if (error || !subs || subs.length === 0) return ["webpush: sin dispositivos"];

  return Promise.all(
    subs.map(async (s: any) => {
      try {
        const r = await webpush.sendNotification(s.subscription, payload, {
          TTL: 3600, // si el móvil está dormido, FCM guarda el aviso 1 hora
          urgency: "high",
        });
        return `webpush ${s.id}: ${r.statusCode}`; // 201 = FCM lo aceptó
      } catch (err: any) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          // Suscripción caducada: se borra para no acumular filas muertas
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        }
        return `webpush ${s.id}: error ${status ?? err?.message}`;
      }
    })
  );
}

export async function POST(req: Request) {
  try {
    const { title, body } = await req.json();

    const finalTitle = title || "💈 ¡Nueva Cita Confirmada!";
    const finalBody = body || "Tienes una nueva cita en la agenda.";

    const payload = JSON.stringify({
      title: finalTitle,
      body: finalBody,
      url: "/admin",
      timestamp: Date.now(),
    });

    const [tg, wp] = await Promise.all([
      sendTelegram(`${finalTitle}\n${finalBody}`),
      sendWebPush(payload),
    ]);

    // Visible en Vercel > Logs. Aquí verás si FCM devuelve 201 para el Android.
    console.log("send-push:", [tg, ...wp].join(" | "));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error general en send-push:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}