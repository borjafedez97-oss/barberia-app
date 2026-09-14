"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { BARBER_INFO, SERVICES } from "@/data/services";
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
  AlertCircle,
  Trash2,
  Search,
  UserPlus,
  ShieldBan
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

const ADMIN_PIN = "1234";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modal para Bloquear Hora
  const [showBlockModal, setShowBlockModal] = useState<boolean>(false);
  const [blockDate, setBlockDate] = useState<string>("");
  const [blockTime, setBlockTime] = useState<string>("10:00");
  const [blockReason, setBlockReason] = useState<string>("Descanso / Asunto propio");

  // Modal para Añadir Cita Manual (cliente por teléfono o en persona)
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualName, setManualName] = useState<string>("");
  const [manualPhone, setManualPhone] = useState<string>("");
  const [manualDate, setManualDate] = useState<string>("");
  const [manualTime, setManualTime] = useState<string>("16:00");
  const [manualService, setManualService] = useState<string>(SERVICES[0].name);
  const [manualPrice, setManualPrice] = useState<number>(SERVICES[0].price);

  const allSlots = [...BARBER_INFO.morningSlots, ...BARBER_INFO.afternoonSlots];

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
    setBlockDate(today);
    setManualDate(today);

    const sessionAuth = sessionStorage.getItem("jbarbers_auth");
    if (sessionAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

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

  // DESBLOQUEAR / ELIMINAR CITA O BLOQUEO
  const handleDeleteAppointment = async (id: string, isBlock: boolean) => {
    const confirmMessage = isBlock
      ? "¿Quieres desbloquear esta hora para que vuelva a estar libre en la web?"
      : "¿Seguro que deseas eliminar esta cita por completo de la agenda?";

    if (!window.confirm(confirmMessage)) return;

    const { error } = await supabase.from("appointments").delete().eq("id", id);

    if (!error) {
      setAppointments((prev) => prev.filter((app) => app.id !== id));
    }
  };

  // GUARDAR BLOQUEO MANUAL
  const handleBlockSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("appointments").insert([
      {
        client_name: `[BLOQUEADO] ${blockReason.trim() || "No disponible"}`,
        client_phone: BARBER_INFO.phone,
        service_name: "Hora bloqueada",
        price: 0,
        booking_date: blockDate,
        booking_time: blockTime,
        status: "confirmed",
      },
    ]);

    if (!error) {
      setShowBlockModal(false);
      if (blockDate === selectedDate) {
        fetchDayAppointments();
      } else {
        setSelectedDate(blockDate);
      }
    }
  };

  // GUARDAR CITA MANUAL
  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      alert("Introduce el nombre del cliente.");
      return;
    }

    const { error } = await supabase.from("appointments").insert([
      {
        client_name: manualName.trim(),
        client_phone: manualPhone.trim() || "En local",
        service_name: manualService,
        price: manualPrice,
        booking_date: manualDate,
        booking_time: manualTime,
        status: "confirmed",
      },
    ]);

    if (!error) {
      setShowManualModal(false);
      setManualName("");
      setManualPhone("");
      if (manualDate === selectedDate) {
        fetchDayAppointments();
      } else {
        setSelectedDate(manualDate);
      }
    }
  };

  // RECORDATORIO WHATSAPP
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
      `Si te surge cualquier imprevisto avísame por aquí. ¡Nos vemos!`;

    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  // CAMBIO RÁPIDO DE FECHAS
  const setQuickDate = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const iso = d.toISOString().split("T")[0];
    setSelectedDate(iso);
  };

  // FILTRAR POR BÚSQUEDA
  const filteredAppointments = appointments.filter((a) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.client_name.toLowerCase().includes(term) ||
      a.client_phone.toLowerCase().includes(term) ||
      a.service_name.toLowerCase().includes(term)
    );
  });

  const activeAppointments = filteredAppointments.filter((a) => a.status !== "cancelled" && !a.client_name.startsWith("[BLOQUEADO]"));
  const totalRevenue = activeAppointments.reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  // ACCESO CON PIN
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
            <p className="text-xs text-zinc-400 mt-1">Introduce el PIN de 4 dígitos</p>
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
                <AlertCircle className="w-3.5 h-3.5" /> PIN incorrecto (Prueba: 1234)
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition text-sm shadow-md shadow-amber-500/20"
          >
            Entrar a la Agenda
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center">
      {/* CABECERA SUPERIOR */}
      <header className="w-full max-w-2xl bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-20 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-amber-400 tracking-wide">JBARBERS • AGENDA</h1>
            <p className="text-[11px] text-zinc-400">Control de citas, bloqueos y caja</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setManualDate(selectedDate);
                setShowManualModal(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Cita</span>
            </button>

            <button
              onClick={() => {
                setBlockDate(selectedDate);
                setShowBlockModal(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold transition"
            >
              <ShieldBan className="w-3.5 h-3.5 text-amber-400" />
              <span>Bloquear</span>
            </button>

            <button
              onClick={fetchDayAppointments}
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg transition"
              title="Refrescar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* SELECTOR RÁPIDO DE DÍAS */}
        <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
          <button
            onClick={() => setQuickDate(0)}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold rounded-md border border-zinc-700"
          >
            Hoy
          </button>
          <button
            onClick={() => setQuickDate(1)}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold rounded-md border border-zinc-700"
          >
            Mañana
          </button>
          <div className="flex-1 flex items-center justify-end gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </header>

      <main className="w-full max-w-2xl p-4 space-y-4">
        {/* BUSCADOR DE CLIENTES */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por cliente, teléfono o corte..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* RESUMEN DE CAJA Y CLIENTES */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Clientes activos</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-zinc-100 mt-1">{activeAppointments.length}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Caja estimada</span>
              <span className="text-emerald-400 font-bold text-xs">TOTAL</span>
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-1">{totalRevenue} €</p>
          </div>
        </div>

        {/* LISTADO DE HORAS Y CITAS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Agenda ({filteredAppointments.length})
            </h2>
            <span className="text-[11px] text-zinc-500">{selectedDate}</span>
          </div>

          {loading ? (
            <div className="text-center py-10 text-xs text-zinc-500">Cargando agenda...</div>
          ) : filteredAppointments.length === 0 ? (
            <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center text-xs text-zinc-500 space-y-2">
              <p>No hay citas ni horas bloqueadas para este día.</p>
              <button
                onClick={() => {
                  setManualDate(selectedDate);
                  setShowManualModal(true);
                }}
                className="text-amber-400 underline font-semibold text-xs"
              >
                + Añadir una cita manual ahora
              </button>
            </div>
          ) : (
            filteredAppointments.map((app) => {
              const isBlocked = app.client_name.startsWith("[BLOQUEADO]");

              // TARJETA DE HORA BLOQUEADA
              if (isBlocked) {
                return (
                  <div
                    key={app.id}
                    className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-3.5 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" /> {app.booking_time}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          Bloqueado
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{app.client_name.replace("[BLOQUEADO]", "").trim()}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteAppointment(app.id, true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition"
                      title="Desbloquear hora"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Liberar hora</span>
                    </button>
                  </div>
                );
              }

              // TARJETA DE CITA CON CLIENTE
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
                      <p className="text-xs text-zinc-400">
                        {app.service_name} • <strong className="text-zinc-200">{app.price} €</strong>
                      </p>

                      {app.notes && (
                        <p className="text-xs text-zinc-400 bg-zinc-950/80 p-2 rounded-lg border border-zinc-800 mt-2">
                          💬 Nota: {app.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {app.client_phone !== "En local" && (
                        <a
                          href={`tel:${app.client_phone}`}
                          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 rounded-lg transition"
                          title="Llamar"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteAppointment(app.id, false)}
                        className="p-2 bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-700 rounded-lg transition"
                        title="Eliminar cita"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* ACCIONES INFERIORES */}
                  <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                    {app.client_phone !== "En local" ? (
                      <button
                        onClick={() => sendWhatsAppReminder(app)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span>Recordar por WhatsApp</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-zinc-500 italic">Cita tomada en persona</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      {app.status !== "completed" && (
                        <button
                          onClick={() => updateStatus(app.id, "completed")}
                          className="px-2.5 py-1.5 bg-zinc-800 hover:bg-emerald-950 text-zinc-300 hover:text-emerald-400 border border-zinc-700 rounded-lg text-xs flex items-center gap-1 font-semibold transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Listo</span>
                        </button>
                      )}
                      {app.status !== "cancelled" && (
                        <button
                          onClick={() => updateStatus(app.id, "cancelled")}
                          className="px-2.5 py-1.5 bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-700 rounded-lg text-xs flex items-center gap-1 font-semibold transition"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Anular</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* MODAL: BLOQUEAR HORA (CON FECHA PROPIA) */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleBlockSlot}
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <ShieldBan className="w-4 h-4 text-amber-400" /> Bloquear una hora
              </h3>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Esa hora no estará disponible para reservar en la web.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300">Día a bloquear:</label>
                <input
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Hora:</label>
                <select
                  value={blockTime}
                  onChange={(e) => setBlockTime(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {allSlots.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Motivo (visible solo para ti):</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ej: Cita médico, descanso, asuntos propios..."
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="w-1/2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold"
              >
                Bloquear Hora
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: AÑADIR CITA MANUAL */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateManualBooking}
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-emerald-400" /> Añadir Cita Manual
              </h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300">Nombre del cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Dani Pérez"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Teléfono (opcional)</label>
                <input
                  type="tel"
                  placeholder="Ej: 612345678"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300">Día:</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300">Hora:</label>
                  <select
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    {allSlots.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Servicio:</label>
                <select
                  value={manualService}
                  onChange={(e) => {
                    const serv = SERVICES.find((s) => s.name === e.target.value);
                    setManualService(e.target.value);
                    if (serv) setManualPrice(serv.price);
                  }}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {SERVICES.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.price} €)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="w-1/2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
              >
                Guardar Cita
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}