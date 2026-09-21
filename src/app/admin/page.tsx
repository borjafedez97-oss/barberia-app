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
  RefreshCw, 
  AlertCircle, 
  Trash2, 
  Search, 
  UserPlus, 
  ShieldBan, 
  Share2, 
  History, 
  CalendarX2, 
  AlertTriangle, 
  Timer,
  ClipboardList,
  CheckCircle2,
  ArrowRight
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

interface WaitlistEntry {
  id: string;
  client_name: string;
  client_phone: string;
  target_date: string;
  notes?: string;
  status: string;
  created_at: string;
}

const ADMIN_PIN = "2712200610";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);

  const [currentView, setCurrentView] = useState<"agenda" | "waitlist">("agenda");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modales
  const [showBlockModal, setShowBlockModal] = useState<boolean>(false);
  const [blockDate, setBlockDate] = useState<string>("");
  const [blockStartTime, setBlockStartTime] = useState<string>("16:00");
  const [blockEndTime, setBlockEndTime] = useState<string>("19:30");
  const [blockReason, setBlockReason] = useState<string>("Asunto personal / Descanso");

  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualName, setManualName] = useState<string>("");
  const [manualPhone, setManualPhone] = useState<string>("");
  const [manualDate, setManualDate] = useState<string>("");
  const [manualTime, setManualTime] = useState<string>("16:00");
  const [manualService, setManualService] = useState<string>(SERVICES[0].name);
  const [manualPrice, setManualPrice] = useState<number>(SERVICES[0].price);

  const [selectedClientHistory, setSelectedClientHistory] = useState<{
    name: string;
    phone: string;
    totalVisits: number;
    totalSpent: number;
    history: Appointment[];
  } | null>(null);

  const [cancelModalApp, setCancelModalApp] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("un imprevisto");

  const allSlots = [...BARBER_INFO.morningSlots, ...BARBER_INFO.afternoonSlots];

  // Cálculo de los slots incluidos en el rango seleccionado
  const slotsToBlock = allSlots.filter((slot) => {
    return slot >= blockStartTime && slot <= blockEndTime;
  });

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

  const fetchAllData = async () => {
    if (!selectedDate) return;
    setLoading(true);

    const { data: dayData } = await supabase
      .from("appointments")
      .select("*")
      .eq("booking_date", selectedDate)
      .order("booking_time", { ascending: true });

    if (dayData) setAppointments(dayData as Appointment[]);

    const { data: wlData } = await supabase
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: true });

    if (wlData) setWaitlistEntries(wlData as WaitlistEntry[]);

    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated && selectedDate) {
      fetchAllData();
    }
  }, [isAuthenticated, selectedDate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel("admin-realtime-clean")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => fetchAllData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waitlist" },
        () => fetchAllData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const updateStatus = async (id: string, newStatus: Appointment["status"]) => {
    setAppointments((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );

    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert("Error al actualizar: " + error.message);
      fetchAllData();
    }
  };

  const handleAcceptAppointment = async (app: Appointment) => {
    await updateStatus(app.id, "confirmed");

    if (app.client_phone !== "En local") {
      const cleanPhone = app.client_phone.replace(/\D/g, "");
      const fullPhone = cleanPhone.startsWith("34") ? cleanPhone : `34${cleanPhone}`;
      const text = `¡Buenas ${app.client_name}! Cita confirmada para el ${app.booking_date} a las ${app.booking_time} h. ¡Te espero! 💈`;

      window.location.href = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    }
  };

  const handleContactWaitlistClient = (entry: WaitlistEntry) => {
    const cleanPhone = entry.client_phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("34") ? cleanPhone : `34${cleanPhone}`;
    const text = `¡Buenas ${entry.client_name}! Se me ha liberado un hueco para hoy. ¿Te viene bien venirte? Respóndeme si lo quieres. 💈`;

    window.location.href = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  };

  const handleDeleteWaitlistEntry = async (id: string) => {
    if (!window.confirm("¿Eliminar de la lista de espera?")) return;
    setWaitlistEntries((prev) => prev.filter((w) => w.id !== id));
    await supabase.from("waitlist").delete().eq("id", id);
  };

  const handleDeleteAppointment = async (id: string, isBlock: boolean) => {
    const confirmMsg = isBlock
      ? "¿Liberar esta hora en la web?"
      : "¿Eliminar esta cita de la agenda?";

    if (!window.confirm(confirmMsg)) return;

    setAppointments((prev) => prev.filter((app) => app.id !== id));
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) {
      alert("Error al eliminar: " + error.message);
      fetchAllData();
    }
  };

  const handleReopenEntireDay = async () => {
    if (!window.confirm(`¿Reabrir todas las horas del ${selectedDate}?`)) return;

    setLoading(true);
    await supabase
      .from("appointments")
      .delete()
      .eq("booking_date", selectedDate)
      .ilike("client_name", "%BLOQUEADO%");

    await fetchAllData();
    setLoading(false);
  };

  const handleCloseEntireDay = async () => {
    const reason = window.prompt("Motivo del cierre:", "Cerrado");
    if (!reason) return;

    setLoading(true);
    await supabase
      .from("appointments")
      .delete()
      .eq("booking_date", selectedDate)
      .ilike("client_name", "%BLOQUEADO%");

    const inserts = allSlots.map((slot) => ({
      client_name: `[BLOQUEADO] ${reason.trim()}`,
      client_phone: BARBER_INFO.phone,
      service_name: "Día cerrado",
      price: 0,
      booking_date: selectedDate,
      booking_time: slot,
      status: "confirmed",
    }));

    await supabase.from("appointments").insert(inserts);
    await fetchAllData();
    setLoading(false);
  };

  const handleConfirmCancellation = async (sendWhatsApp: boolean) => {
    if (!cancelModalApp) return;
    const appToCancel = cancelModalApp;
    setCancelModalApp(null);

    await updateStatus(appToCancel.id, "cancelled");

    if (sendWhatsApp && appToCancel.client_phone !== "En local") {
      const cleanPhone = appToCancel.client_phone.replace(/\D/g, "");
      const fullPhone = cleanPhone.startsWith("34") ? cleanPhone : `34${cleanPhone}`;
      const text = `¡Buenas ${appToCancel.client_name}! Tengo que cancelarte la cita de las ${appToCancel.booking_time} h por ${cancelReason.trim()}. Disculpa las molestias, avísame y buscamos otro hueco. 🙏`;

      window.location.href = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    }
  };

  const handleSendDelayNotice = (app: Appointment) => {
    if (app.client_phone === "En local") return;

    const cleanPhone = app.client_phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("34") ? cleanPhone : `34${cleanPhone}`;
    const text = `¡Buenas ${app.client_name}! Voy con unos 10-15 min de retraso. Vente sobre las ${app.booking_time} y cuarto para no esperar de pie. ¡Gracias! ✂️`;

    window.location.href = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  };

  const handleShareStorySlot = (slotTime: string) => {
    const text = `🚨 ¡Hueco libre hoy a las ${slotTime} h en JBarbers! Reserva en el link de la bio 📲`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert(`¡Texto copiado para Stories:\n\n"${text}"`);
    }
  };

  const handleViewClientHistory = async (app: Appointment) => {
    if (app.client_phone === "En local" || app.client_name.startsWith("[BLOQUEADO]")) return;

    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("client_phone", app.client_phone)
      .order("booking_date", { ascending: false });

    if (data) {
      const active = data.filter((d) => d.status !== "cancelled");
      const spent = active.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

      setSelectedClientHistory({
        name: app.client_name,
        phone: app.client_phone,
        totalVisits: active.length,
        totalSpent: spent,
        history: data as Appointment[],
      });
    }
  };

  const sendWhatsAppReminder = (app: Appointment) => {
    const cleanPhone = app.client_phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("34") ? cleanPhone : `34${cleanPhone}`;
    const text = `¡Buenas ${app.client_name}! Te recuerdo tu cita hoy a las ${app.booking_time} h en JBarbers. ¡Nos vemos! 💈`;

    window.location.href = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  };

  const setQuickDate = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const activeAppointments = appointments.filter(
    (a) => a.status !== "cancelled" && !a.client_name.startsWith("[BLOQUEADO]")
  );
  const totalDayRevenue = activeAppointments.reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const bookedTimeMap = new Map(appointments.map((a) => [a.booking_time, a]));
  const allBlocked = allSlots.length > 0 && allSlots.every((s) => bookedTimeMap.get(s)?.client_name.startsWith("[BLOQUEADO]"));

  const activeAppsForDuplicateCheck = appointments.filter((a) => a.status !== "cancelled");
  const timeOccurrences = activeAppsForDuplicateCheck.reduce((acc, curr) => {
    acc[curr.booking_time] = (acc[curr.booking_time] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredAppointments = appointments.filter((a) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.client_name.toLowerCase().includes(term) ||
      a.client_phone.toLowerCase().includes(term) ||
      a.service_name.toLowerCase().includes(term)
    );
  });

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
            <p className="text-xs text-zinc-400 mt-1">Introduce tu PIN de acceso</p>
          </div>

          <div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={12}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              autoFocus
              className="w-full text-center tracking-[1em] text-2xl font-bold bg-zinc-950 border border-zinc-700 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-amber-400 placeholder:text-zinc-600"
            />
            {pinError && (
              <p className="text-xs text-rose-500 mt-2 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> PIN incorrecto
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center pb-20">
      <header className="w-full max-w-2xl bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-20 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-black text-amber-400 tracking-wider">JBARBERS • CONTROL</h1>
            <p className="text-[11px] text-zinc-400">Panel de agenda en directo</p>
          </div>

          <div className="flex items-center gap-1.5">
            {currentView === "agenda" && (
              <>
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
                  <span>Bloquear Horas</span>
                </button>
              </>
            )}

            <button
              onClick={fetchAllData}
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg transition"
              title="Refrescar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* PESTAÑAS */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-bold">
          <button
            onClick={() => setCurrentView("agenda")}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              currentView === "agenda"
                ? "bg-zinc-800 text-amber-400 shadow-md"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Agenda Diaria ({appointments.length})</span>
          </button>

          <button
            onClick={() => setCurrentView("waitlist")}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 relative ${
              currentView === "waitlist"
                ? "bg-zinc-800 text-amber-400 shadow-md"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Lista de Espera ({waitlistEntries.length})</span>
            {waitlistEntries.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>

        {/* SELECTOR RÁPIDO DE FECHA */}
        {currentView === "agenda" && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/80 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setQuickDate(0)}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold rounded-md border border-zinc-700"
              >
                Hoy
              </button>
              <button
                onClick={() => setQuickDate(1)}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold rounded-md border border-zinc-700"
              >
                Mañana
              </button>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-0.5 text-xs text-zinc-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              {allBlocked ? (
                <button
                  onClick={handleReopenEntireDay}
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/30 transition shadow-sm"
                >
                  🔓 Reabrir día
                </button>
              ) : (
                <button
                  onClick={handleCloseEntireDay}
                  className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-bold bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-md border border-rose-500/30 transition"
                >
                  <CalendarX2 className="w-3 h-3" />
                  <span>Cerrar día</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="w-full max-w-2xl p-4 space-y-4">
        {currentView === "agenda" && (
          <>
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <span className="text-zinc-400 text-xs font-semibold">Recaudación estimada del día</span>
                <p className="text-3xl font-black text-emerald-400 mt-0.5">{totalDayRevenue} €</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-zinc-300 bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-700">
                  {activeAppointments.length} clientes
                </span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-200">Horas del día ({selectedDate})</span>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Libre</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Ocupada</span>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-1.5 pt-1">
                {allSlots.map((slot) => {
                  const app = bookedTimeMap.get(slot);
                  const isBlocked = app?.client_name.startsWith("[BLOQUEADO]");
                  const isBooked = !!app && !isBlocked && app.status !== "cancelled";

                  return (
                    <div
                      key={slot}
                      className={`p-2 rounded-xl border text-center text-[11px] flex flex-col justify-between transition ${
                        isBooked
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold shadow-sm"
                          : isBlocked
                          ? "bg-zinc-850 border-zinc-800 text-zinc-500 line-through"
                          : "bg-emerald-950/20 border-emerald-900/40 text-emerald-400"
                      }`}
                    >
                      <span>{slot}</span>
                      {!isBooked && !isBlocked && (
                        <button
                          onClick={() => handleShareStorySlot(slot)}
                          className="mt-1 text-[9px] text-zinc-400 hover:text-amber-400 flex items-center justify-center gap-0.5"
                          title="Copiar para Instagram Story"
                        >
                          <Share2 className="w-2.5 h-2.5" /> Story
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar cliente, teléfono o corte..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Agenda ({filteredAppointments.length})
                </h2>
                <span className="text-[11px] text-zinc-500 font-semibold">{selectedDate}</span>
              </div>

              {loading ? (
                <div className="text-center py-10 text-xs text-zinc-500">Cargando...</div>
              ) : filteredAppointments.length === 0 ? (
                <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500 space-y-2">
                  <p>No hay citas ni bloqueos registrados para este día.</p>
                  <button
                    onClick={() => {
                      setManualDate(selectedDate);
                      setShowManualModal(true);
                    }}
                    className="text-amber-400 underline font-semibold text-xs"
                  >
                    + Añadir cita manual
                  </button>
                </div>
              ) : (
                filteredAppointments.map((app) => {
                  const isBlocked = app.client_name.startsWith("[BLOQUEADO]");
                  const isDuplicate = !isBlocked && app.status !== "cancelled" && timeOccurrences[app.booking_time] > 1;

                  if (isBlocked) {
                    return (
                      <div
                        key={app.id}
                        className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-3.5 flex items-center justify-between"
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Liberar</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={app.id}
                      className={`border rounded-2xl p-4 transition space-y-3 shadow-lg ${
                        isDuplicate
                          ? "bg-rose-950/20 border-rose-500/70"
                          : app.status === "cancelled"
                          ? "bg-zinc-900/40 border-zinc-900 opacity-60"
                          : app.status === "pending"
                          ? "bg-amber-950/15 border-amber-500/50"
                          : app.status === "completed"
                          ? "bg-emerald-950/10 border-emerald-900/40"
                          : "bg-zinc-900 border-zinc-800"
                      }`}
                    >
                      {isDuplicate && (
                        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-[11px] text-rose-300 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>⚠️ HORA DUPLICADA: Coincide a las {app.booking_time} h</span>
                        </div>
                      )}

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
                                  : app.status === "pending"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse"
                                  : "bg-zinc-800 text-zinc-300 border-zinc-700"
                              }`}
                            >
                              {app.status === "pending"
                                ? "⏳ Pendiente de Aceptar"
                                : app.status === "confirmed"
                                ? "Confirmada"
                                : app.status === "completed"
                                ? "Completada"
                                : "Cancelada"}
                            </span>
                          </div>

                          <button
                            onClick={() => handleViewClientHistory(app)}
                            className="text-sm font-bold text-zinc-100 mt-1 hover:text-amber-400 flex items-center gap-1 text-left"
                          >
                            <span>{app.client_name}</span>
                            <History className="w-3 h-3 text-zinc-500" />
                          </button>

                          <p className="text-xs text-zinc-400">
                            {app.service_name} • <strong className="text-zinc-200">{app.price} €</strong>
                          </p>

                          {app.notes && (
                            <p className="text-xs text-zinc-400 bg-zinc-950/80 p-2 rounded-xl border border-zinc-800 mt-2">
                              💬 {app.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {app.client_phone !== "En local" && (
                            <a
                              href={`tel:${app.client_phone}`}
                              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 rounded-xl transition"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteAppointment(app.id, false)}
                            className="p-2 bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-700 rounded-xl transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                        {app.status === "pending" ? (
                          <div className="w-full flex items-center gap-2">
                            <button
                              onClick={() => handleAcceptAppointment(app)}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Aceptar y confirmar por WhatsApp</span>
                            </button>
                            <button
                              onClick={() => setCancelModalApp(app)}
                              className="px-3 py-2 bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 rounded-xl text-xs font-semibold transition"
                            >
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <>
                            {app.client_phone !== "En local" && app.status !== "cancelled" ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  onClick={() => sendWhatsAppReminder(app)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                                  <span>Recordar</span>
                                </button>

                                <button
                                  onClick={() => handleSendDelayNotice(app)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-medium transition"
                                >
                                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                                  <span>+10 min</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-500 italic">
                                {app.status === "cancelled" ? "Cancelada" : "En persona"}
                              </span>
                            )}

                            <div className="flex items-center gap-1.5">
                              {app.status !== "completed" && app.status !== "cancelled" && (
                                <button
                                  onClick={() => updateStatus(app.id, "completed")}
                                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-emerald-950 text-zinc-300 hover:text-emerald-400 border border-zinc-700 rounded-xl text-xs flex items-center gap-1 font-semibold transition"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Listo</span>
                                </button>
                              )}
                              {app.status !== "cancelled" && (
                                <button
                                  onClick={() => setCancelModalApp(app)}
                                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-700 rounded-xl text-xs flex items-center gap-1 font-semibold transition"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Anular</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {currentView === "waitlist" && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-md space-y-1">
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-400" />
                <span>Lista de Espera ({waitlistEntries.length})</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Orden de llegada: el primero de la lista es el que antes pidió hueco.
              </p>
            </div>

            {waitlistEntries.length === 0 ? (
              <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500">
                No hay nadie en lista de espera ahora mismo.
              </div>
            ) : (
              <div className="space-y-2.5">
                {waitlistEntries.map((entry, index) => {
                  const requestTime = new Date(entry.created_at).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <div
                      key={entry.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black flex items-center justify-center shrink-0">
                            #{index + 1}
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-zinc-100">{entry.client_name}</h3>
                            <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-amber-400" />
                              <span>{entry.client_phone}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Para el {entry.target_date}
                          </span>
                          <p className="text-[10px] text-zinc-500 mt-1">
                            {requestTime} h
                          </p>
                        </div>
                      </div>

                      {entry.notes && (
                        <p className="text-xs text-zinc-400 bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                          💬 {entry.notes}
                        </p>
                      )}

                      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleContactWaitlistClient(entry)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span>Avisar Hueco Libre</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${entry.client_phone}`}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 rounded-xl transition"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteWaitlistEntry(entry.id)}
                            className="p-1.5 bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-700 rounded-xl transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: BLOQUEAR FRANJA HORARIA (DESDE - HASTA) */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={async (e) => {
              e.preventDefault();

              if (slotsToBlock.length === 0) {
                alert("La hora de inicio debe ser anterior o igual a la hora de fin.");
                return;
              }

              // Creamos los bloqueos para cada una de las horas del rango
              const inserts = slotsToBlock.map((slot) => ({
                client_name: `[BLOQUEADO] ${blockReason.trim() || "No disponible"}`,
                client_phone: BARBER_INFO.phone,
                service_name: "Franja bloqueada",
                price: 0,
                booking_date: blockDate,
                booking_time: slot,
                status: "confirmed",
              }));

              const { error } = await supabase.from("appointments").insert(inserts);

              if (error) {
                alert("Error al bloquear la franja: " + error.message);
              }

              setShowBlockModal(false);
              fetchAllData();
            }}
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <ShieldBan className="w-4 h-4 text-amber-400" /> Bloquear Franja Horaria
              </h3>
              <button type="button" onClick={() => setShowBlockModal(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300">Día:</label>
                <input
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm text-zinc-100 focus:outline-none"
                />
              </div>

              {/* SELECTORES DE RANGO HORARIO (DESDE - HASTA) */}
              <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" /> Desde:
                  </label>
                  <select
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                    className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg p-1.5 text-xs text-zinc-100 focus:outline-none"
                  >
                    {allSlots.map((t) => (
                      <option key={t} value={t}>{t} h</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3 text-amber-400" /> Hasta:
                  </label>
                  <select
                    value={blockEndTime}
                    onChange={(e) => setBlockEndTime(e.target.value)}
                    className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg p-1.5 text-xs text-zinc-100 focus:outline-none"
                  >
                    {allSlots.map((t) => (
                      <option key={t} value={t}>{t} h</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* RESUMEN DE SLOTS QUE SE VAN A BLOQUEAR */}
              <div className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-center font-medium">
                {slotsToBlock.length > 0 ? (
                  <span>Se cerrarán <strong>{slotsToBlock.length} turnos</strong> ({blockStartTime} a {blockEndTime} h)</span>
                ) : (
                  <span className="text-rose-400">Rango no válido (la hora de fin debe ser posterior)</span>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Motivo (solo para ti):</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ej: Asunto personal, descanso..."
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm text-zinc-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowBlockModal(false)} className="w-1/2 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold">Cancelar</button>
              <button 
                type="submit" 
                disabled={slotsToBlock.length === 0}
                className={`w-1/2 py-2.5 rounded-xl text-xs font-bold transition ${
                  slotsToBlock.length > 0 
                    ? "bg-amber-500 hover:bg-amber-400 text-zinc-950" 
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
              >
                Bloquear Franja
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ANULAR CITA */}
      {cancelModalApp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Cancelar Cita
              </h3>
              <button onClick={() => setCancelModalApp(null)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300">
              Anular cita de <strong className="text-white">{cancelModalApp.client_name}</strong> a las <strong>{cancelModalApp.booking_time} h</strong>.
            </p>

            <div>
              <label className="text-xs font-semibold text-zinc-400">Motivo breve:</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej: un imprevisto personal..."
                className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleConfirmCancellation(true)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Anular y avisar por WhatsApp</span>
              </button>

              <button
                onClick={() => handleConfirmCancellation(false)}
                className="w-full py-2 bg-zinc-800 hover:bg-rose-950 text-rose-400 rounded-xl text-xs font-semibold transition"
              >
                Anular sin avisar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HISTORIAL DEL CLIENTE */}
      {selectedClientHistory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-400" /> Ficha de {selectedClientHistory.name}
              </h3>
              <button onClick={() => setSelectedClientHistory(null)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-center">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">Visitas</p>
                <p className="text-lg font-black text-amber-400">{selectedClientHistory.totalVisits}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">Gasto total</p>
                <p className="text-lg font-black text-emerald-400">{selectedClientHistory.totalSpent} €</p>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-zinc-400">Historial:</p>
              {selectedClientHistory.history.map((h) => (
                <div key={h.id} className="text-[11px] p-2 bg-zinc-950/60 rounded-xl border border-zinc-850 flex justify-between">
                  <span>{h.booking_date} • {h.service_name}</span>
                  <strong className="text-amber-400">{h.price} €</strong>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedClientHistory(null)}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL: AÑADIR CITA MANUAL */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!manualName.trim()) return;

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

              if (error) alert("Error al guardar: " + error.message);

              setShowManualModal(false);
              setManualName("");
              setManualPhone("");
              fetchAllData();
            }}
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-emerald-400" /> Cita Manual
              </h3>
              <button type="button" onClick={() => setShowManualModal(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300">Nombre del cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcos Pérez"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm text-zinc-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Teléfono (opcional)</label>
                <input
                  type="tel"
                  placeholder="Ej: 612345678"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300">Día:</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300">Hora:</label>
                  <select
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-xs text-zinc-100 focus:outline-none"
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
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-xs text-zinc-100 focus:outline-none"
                >
                  {SERVICES.map((s) => (
                    <option key={s.id} value={s.name}>{s.name} ({s.price} €)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowManualModal(false)} className="w-1/2 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold">Cancelar</button>
              <button type="submit" className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}