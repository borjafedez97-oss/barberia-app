"use client";

import { useState, useEffect, useCallback } from "react";
import { BARBER_INFO } from "@/data/services";
import { supabase } from "@/lib/supabase";
import { Calendar, XCircle, MessageSquare, Phone, User, Clock, Scissors, RefreshCw } from "lucide-react";

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  service_name: string;
  price: number;
  booking_time: string;
  booking_date: string;
  notes?: string;
  status: "pending" | "confirmed" | "cancelled";
}

export default function AdminDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("booking_date", selectedDate)
      .order("booking_time", { ascending: true });

    if (!error && data) {
      setAppointments(data as Appointment[]);
    } else if (error) {
      console.error("Error al consultar Supabase:", error.message);
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const updateStatus = async (id: string, newStatus: "confirmed" | "cancelled") => {
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

  const sendConfirmationWhatsApp = (app: Appointment) => {
    const text = 
      `¡Hola ${app.client_name}! 💈 Confirmada tu cita en *${BARBER_INFO.name}*:\n\n` +
      `✂️ *Servicio:* ${app.service_name}\n` +
      `📅 *Día:* ${app.booking_date}\n` +
      `⏰ *Hora:* ${app.booking_time} h\n\n` +
      `¡Te esperamos puntual!`;

    window.open(`https://wa.me/${app.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
    updateStatus(app.id, "confirmed");
  };

  const totalRevenue = appointments
    .filter((a) => a.status === "confirmed")
    .reduce((acc, curr) => acc + Number(curr.price), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* ENCABEZADO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-zinc-100">Panel de Control • {BARBER_INFO.name}</h1>
              <p className="text-xs text-zinc-400">Organización y confirmación de reservas</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-zinc-400 block">Total confirmado para este día:</span>
            <span className="text-xl font-bold text-amber-400">{totalRevenue} €</span>
          </div>
        </div>

        {/* SELECTOR DE FECHA Y BOTÓN REFRESCAR */}
        <div className="flex items-center justify-between bg-zinc-900 p-4 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <label className="text-xs font-semibold text-zinc-300">Agenda del día:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 ml-2"
            />
          </div>
          <button
            onClick={fetchAppointments}
            disabled={loading}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            title="Recargar citas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
          </button>
        </div>

        {/* LISTADO DE CITAS REALES */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Citas ({appointments.length})
          </h2>

          {loading ? (
            <div className="p-8 text-center text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800 text-xs">
              Cargando reservas...
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800 text-xs">
              No hay citas programadas para esta fecha.
            </div>
          ) : (
            appointments.map((app) => (
              <div
                key={app.id}
                className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {app.booking_time} h
                    </span>
                    <span className="font-semibold text-sm text-zinc-100">{app.service_name}</span>
                    <span className="text-xs font-bold text-zinc-400">({app.price} €)</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                        app.status === "confirmed"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : app.status === "cancelled"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {app.status === "confirmed" ? "Confirmada" : app.status === "cancelled" ? "Cancelada" : "Pendiente"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-400 pt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-zinc-500" /> {app.client_name}
                    </span>
                    <a
                      href={`tel:${app.client_phone}`}
                      className="flex items-center gap-1 text-zinc-300 hover:text-amber-400 underline"
                    >
                      <Phone className="w-3.5 h-3.5 text-zinc-500" /> {app.client_phone}
                    </a>
                  </div>

                  {app.notes && (
                    <p className="text-[11px] text-zinc-400 italic bg-zinc-950/60 p-2 rounded border border-zinc-800/60 mt-1">
                      Nota: {app.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => sendConfirmationWhatsApp(app)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Confirmar por WhatsApp</span>
                  </button>

                  <button
                    onClick={() => updateStatus(app.id, "cancelled")}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs transition"
                    title="Cancelar cita"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}