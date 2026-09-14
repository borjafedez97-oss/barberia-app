"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { BARBER_INFO } from "@/data/services";
import { 
  Lock, 
  Calendar, 
  Clock, 
  Phone, 
  Check, 
  X, 
  MessageCircle, 
  Users, 
  RefreshCw,
  PlusCircle,
  AlertCircle
} from "lucide-react";

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  service_name: string;
  price: number;
  booking_date: string;
  booking_time: string;
  notes?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  created_at: string;
}

// PIN de acceso por defecto (puedes cambiarlo cuando quieras)
const ADMIN_PIN = "1234";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Modal para bloquear hora manual
  const [showBlockModal, setShowBlockModal] = useState<boolean>(false);
  const [blockTime, setBlockTime] = useState<string>("10:00");
  const [blockReason, setBlockReason] = useState<string>("Descanso / Asunto propio");

  // Iniciar con la fecha de hoy
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);

    const sessionAuth = sessionStorage.getItem("jbarbers_auth");
    if (sessionAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Cargar citas al autenticar o cambiar de fecha
  useEffect(() => {
    if (isAuthenticated && selectedDate) {
      fetchDayAppointments();
    }
  }, [isAuthenticated, selectedDate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsAuthenticated(true);
      sessionStorage.setItem("jbarbers_auth", "true");
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  const fetchDayAppointments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("booking_date", selectedDate)
      .order("booking_time", { ascending: true });

    if (!error && data) {
      setAppointments(data as Appointment[]);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: Appointment["status"]) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) {
      setAppointments((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
      );
    }
  };

  // Bloquear hora manualmente
  const handleBlockSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("appointments").insert([
      {
        client_name: `[BLOQUEADO] ${blockReason}`,
        client_phone: BARBER_INFO.phone,
        service_name: "Bloqueo de agenda",
        price: 0,
        booking_date: selectedDate,
        booking_time: blockTime,
        status: "confirmed",
      },
    ]);

    if (!error) {
      setShowBlockModal(false);
      fetchDayAppointments();
    }
  };

  // Enviar recordatorio de WhatsApp al cliente
  const sendWhatsAppReminder = (app: Appointment) => {
    const cleanPhone = app.client_phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("34") ? cleanPhone : `34${cleanPhone}`;

    const text =
      `💈 *RECORDATORIO DE CITA - JBARBERS* 💈\n\n` +
      `¡Buenas, *${app.client_name}*! Te recuerdo tu cita reservada:\n\n` +
      `✂️ *Servicio:* ${app.service_name}\n` +
      `📅 *Día:* ${app.booking_date}\n` +
      `⏰ *Hora:* ${app.booking_time} h\n` +
      `📍 *Dirección:* ${BARBER_INFO.address}\n\n` +
      `Si te surge cualquier imprevisto, avísame con antelación por aquí. ¡Nos vemos!`;

    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Métricas del día seleccionado
  const activeAppointments = appointments.filter((a) => a.status !== "cancelled");
  const totalRevenue = activeAppointments.reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  // 1. PANTALLA DE ACCESO CON PIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4 shadow-xl"
        >
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-wide">Panel JBarbers</h1>
            <p className="text-xs text-zinc-400 mt-1">Introduce tu PIN de 4 dígitos para entrar</p>
          </div>

          <div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              autoFocus
              className="w-full text-center tracking-[1em] text-2xl font-bold bg-zinc-950 border border-zinc-700 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-amber-400 placeholder:text-zinc-600"
            />
            {pinError && (
              <p className="text-xs text-rose-500 mt-2 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> PIN incorrecto (Por defecto: 1234)
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition text-sm shadow-md shadow-amber-500/20"
          >
            Entrar al Panel
          </button>
        </form>
      </div>
    );
  }

  // 2. PANEL DE CONTROL AUTENTICADO
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center">
      {/* CABECERA */}
      <header className="w-full max-w-2xl bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-20 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-amber-400">JBARBERS • PANEL</h1>
          <p className="text-xs text-zinc-400">Agenda diaria y caja</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBlockModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Bloquear hora</span>
          </button>
          <button
            onClick={fetchDayAppointments}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 rounded-lg transition"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
          </button>
        </div>
      </header>

      <main className="w-full max-w-2xl p-4 space-y-4">
        {/* SELECTOR DE FECHA */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-zinc-300 text-xs font-semibold">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Fecha:</span>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* MÉTRICAS DE CAJA DEL DÍA */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Clientes de hoy</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-zinc-100 mt-1">{activeAppointments.length}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Caja estimada</span>
              <span className="text-emerald-400 font-extrabold text-sm">EUR</span>
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-1">{totalRevenue} €</p>
          </div>
        </div>

        {/* LISTADO DE CITAS */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Citas programadas ({appointments.length})
          </h2>

          {loading ? (
            <div className="text-center py-10 text-xs text-zinc-500">Cargando citas...</div>
          ) : appointments.length === 0 ? (
            <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center text-xs text-zinc-500">
              No hay citas reservadas para este día.
            </div>
          ) : (
            appointments.map((app) => {
              const isBlocked = app.client_name.startsWith("[BLOQUEADO]");

              return (
                <div
                  key={app.id}
                  className={`border rounded-xl p-4 transition space-y-3 ${
                    app.status === "cancelled"
                      ? "bg-zinc-900/40 border-zinc-900 opacity-60"
                      : app.status === "completed"
                      ? "bg-emerald-950/10 border-emerald-900/40"
                      : "bg-zinc-900 border-zinc-800"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-amber-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {app.booking_time}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                            app.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : app.status === "cancelled"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {app.status === "pending"
                            ? "Pendiente"
                            : app.status === "confirmed"
                            ? "Confirmada"
                            : app.status === "completed"
                            ? "Completada"
                            : "Cancelada"}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-zinc-100 mt-1">{app.client_name}</h3>
                      <p className="text-xs text-zinc-400">{app.service_name} • <strong className="text-zinc-200">{app.price} €</strong></p>

                      {app.notes && (
                        <p className="text-xs text-zinc-400 bg-zinc-950/80 p-2 rounded-lg border border-zinc-800 mt-2">
                          💬 Nota: {app.notes}
                        </p>
                      )}
                    </div>

                    {!isBlocked && (
                      <div className="text-right">
                        <a
                          href={`tel:${app.client_phone}`}
                          className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-amber-400 font-semibold"
                        >
                          <Phone className="w-3.5 h-3.5 text-amber-400" />
                          <span>{app.client_phone}</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* ACCIONES RÁPIDAS (RECORDATORIO WHATSAPP Y ESTADO) */}
                  {!isBlocked && (
                    <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => sendWhatsAppReminder(app)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span>Recordar por WhatsApp</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {app.status !== "completed" && (
                          <button
                            onClick={() => updateStatus(app.id, "completed")}
                            className="p-1.5 bg-zinc-800 hover:bg-emerald-950 text-zinc-300 hover:text-emerald-400 border border-zinc-700 rounded-lg transition"
                            title="Marcar como completada"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {app.status !== "cancelled" && (
                          <button
                            onClick={() => updateStatus(app.id, "cancelled")}
                            className="p-1.5 bg-zinc-800 hover:bg-rose-950 text-zinc-300 hover:text-rose-400 border border-zinc-700 rounded-lg transition"
                            title="Cancelar cita"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* MODAL PARA BLOQUEAR HORA MANUALMENTE */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleBlockSlot}
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4"
          >
            <h3 className="text-sm font-bold text-zinc-100">Bloquear una hora</h3>
            <p className="text-xs text-zinc-400">
              Esta hora quedará tachada para que ningún cliente pueda reservarla.
            </p>

            <div>
              <label className="text-xs text-zinc-400">Hora:</label>
              <select
                value={blockTime}
                onChange={(e) => setBlockTime(e.target.value)}
                className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                {BARBER_INFO.morningSlots.concat(BARBER_INFO.afternoonSlots).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400">Motivo (solo para ti):</label>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="w-1/2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold"
              >
                Bloquear
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}