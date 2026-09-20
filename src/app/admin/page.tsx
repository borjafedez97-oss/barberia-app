"use client";

import { useState, useEffect, useMemo } from "react";
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
  TrendingUp,
  BarChart3,
  Award,
  ChevronRight,
  ClipboardList,
  CheckCircle2
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

const ADMIN_PIN = "1234";

const getMonthLabel = (monthStr: string) => {
  if (!monthStr || !monthStr.includes("-")) return monthStr;
  const [y, m] = monthStr.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  const name = date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return name.charAt(0).toUpperCase() + name.slice(1);
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);

  // Vistas: 'agenda' o 'waitlist'
  const [currentView, setCurrentView] = useState<"agenda" | "waitlist">("agenda");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modales
  const [showBlockModal, setShowBlockModal] = useState<boolean>(false);
  const [blockDate, setBlockDate] = useState<string>("");
  const [blockTime, setBlockTime] = useState<string>("10:00");
  const [blockReason, setBlockReason] = useState<string>("Descanso / Asunto propio");

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
  const [cancelReason, setCancelReason] = useState<string>("un imprevisto de fuerza mayor");

  const [showMonthlyModal, setShowMonthlyModal] = useState<boolean>(false);
  const [selectedStatsMonth, setSelectedStatsMonth] = useState<string>("");

  const allSlots = [...BARBER_INFO.morningSlots, ...BARBER_INFO.afternoonSlots];

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
    setBlockDate(today);
    setManualDate(today);
    setSelectedStatsMonth(today.substring(0, 7));

    const sessionAuth = sessionStorage.getItem("jbarbers_auth");
    if (sessionAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const fetchAllData = async () => {
    if (!selectedDate) return;
    setLoading(true);

    // 1. Citas del día
    const { data: dayData } = await supabase
      .from("appointments")
      .select("*")
      .eq("booking_date", selectedDate)
      .order("booking_time", { ascending: true });

    if (dayData) setAppointments(dayData as Appointment[]);

    // 2. Todas las citas para estadísticas
    const { data: allData } = await supabase
      .from("appointments")
      .select("*")
      .order("booking_date", { ascending: false });

    if (allData) setAllAppointments(allData as Appointment[]);

    // 3. Lista de espera completa ordenada cronológicamente (antiguos primero)
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

  // Realtime para citas y para lista de espera
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel("admin-realtime-all")
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
      alert("Error al actualizar estado: " + error.message);
      fetchAllData();
    }
  };

  // BOTÓN 1: ACEPTAR CITA (Pasa a confirmado y abre WhatsApp)
  const handleAcceptAppointment = async (app: Appointment) => {
    await updateStatus(app.id, "confirmed");

    if (app.client_phone !== "En local") {
      const cleanPhone = app.client_phone.replace(/\D/g, "");
      const fullPhone = cleanPhone.startsWith("34") ? cleanPhone : `34${cleanPhone}`;

      const text =
        `💈 *CITA CONFIRMADA - JBARBERS* 💈\n\n` +
        `¡Buenas, *${app.client_name}*! Te confirmo tu cita para el día *${app.booking_date}* a las *${app.booking_time} h*.\n\n` +
        `✂️ *Servicio:* ${app.service_name} (${app.price} €)\n` +
        `📍 *Dirección:* ${BARBER_INFO.address}\n\n` +
        `¡Te espero allí! Si te surge cualquier cosa avísame por aquí.`;

      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  // AVISAR A ALGUIEN DE LA LISTA DE ESPERA
  const handleContactWaitlistClient = (entry: WaitlistEntry) => {
    const cleanPhone = entry.client_phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("34") ? cleanPhone : `34${cleanPhone}`;

    const text =
      `💈 *HUECO DISPONIBLE - JBARBERS* 💈\n\n` +
      `¡Buenas, *${entry.client_name}*! Te escribo porque estabas apuntado en la lista de espera para el *${entry.target_date}* y se me acaba de liberar un hueco.\n\n` +
      `¿Sigues interesado en cortarte el pelo hoy? Respóndeme a este mensaje y te guardo la hora. ¡Gracias!`;

    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleDeleteWaitlistEntry = async (id: string) => {
    if (!window.confirm("¿Eliminar a este cliente de la lista de espera?")) return;
    setWaitlistEntries((prev) => prev.filter((w) => w.id !== id));
    await supabase.from("waitlist").delete().eq("id", id);
  };

  const handleDeleteAppointment = async (id: string, isBlock: boolean) => {
    const confirmMsg = isBlock
      ? "¿Liberar esta hora para que vuelva a estar disponible en la web?"
      : "¿Eliminar esta cita por completo de la agenda?";

    if (!window.confirm(confirmMsg)) return;

    setAppointments((prev) => prev.filter((app) => app.id !== id));
    setAllAppointments((prev) => prev.filter((app) => app.id !== id));

    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) {
      alert("Error al eliminar: " + error.message);
      fetchAllData();
    }
  };

  const handleReopenEntireDay = async () => {
    if (!window.confirm(`¿Seguro que deseas reabrir todas las horas del día ${selectedDate}?`)) return;

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
    const reason = window.prompt("Motivo del cierre:", "Festivo / Vacaciones / Jarramplas");
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
    await updateStatus(cancelModalApp.id, "cancelled");

    if (sendWhatsApp && cancelModalApp.client_phone !== "En local") {
      const cleanPhone = cancelModalApp.client_phone.replace(/\D/g, "");
      const fullPhone = cleanPhone.startsWith("34") ? cleanPhone : `34${cleanPhone}`;
      const webUrl = typeof window !== "undefined" ? window.location.origin : "nuestra web";

      const text =
        `💈 *AVISO DE CANCELACIÓN - JBARBERS* 💈\n\n` +
        `¡Buenas, *${cancelModalApp.client_name}*! Te escribo porque lamentablemente tengo que cancelar tu cita del día *${cancelModalApp.booking_date}* a las *${cancelModalApp.booking_time} h* debido a ${cancelReason.trim()}.\n\n` +
        `🙏 Te pido mil disculpas por el contratiempo. Puedes volver a pedir cita en cualquier otro hueco libre entrando aquí:\n` +
        `👉 ${webUrl}\n\n` +
        `O si lo prefieres, dime qué otra hora te vendría bien y te busco un hueco. ¡Muchas gracias por la comprensión!`;

      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, "_blank");
    }

    setCancelModalApp(null);
  };

  const handleSendDelayNotice = (app: Appointment) => {
    if (app.client_phone === "En local") return;

    const cleanPhone = app.client_phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("34") ? cleanPhone : `34${cleanPhone}`;

    const text =
      `💈 *AVISO DE HORARIO - JBARBERS* 💈\n\n` +
      `¡Buenas, *${app.client_name}*! Te aviso con un poco de antelación de que voy con unos *10-15 minutos de retraso* con los cortes de antes.\n\n` +
      `Para que no tengas que estar esperando aquí de pie, puedes venirte con calma sobre las *${app.booking_time}* y cuarto. ¡Disculpa las molestias y nos vemos ahora!`;

    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleShareStorySlot = (slotTime: string) => {
    const text =
      `🚨 ¡HUECO LIBRE DE ÚLTIMA HORA! 💈\n` +
      `📅 Hoy a las ${slotTime} h en JBarbers Piornal.\n\n` +
      `📲 Pide la cita antes de que vuele en el enlace de la bio:`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert(`¡Texto copiado!\n\nPégalo en tu Story de Instagram:\n\n"${text}"`);
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

  const setQuickDate = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // CÁLCULOS
  const activeAppointments = appointments.filter(
    (a) => a.status !== "cancelled" && !a.client_name.startsWith("[BLOQUEADO]")
  );
  const totalDayRevenue = activeAppointments.reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const currentMonthKey = selectedDate.substring(0, 7);
  const currentMonthApps = useMemo(() => {
    return allAppointments.filter(
      (a) =>
        a.booking_date.startsWith(currentMonthKey) &&
        a.status !== "cancelled" &&
        !a.client_name.startsWith("[BLOQUEADO]")
    );
  }, [allAppointments, currentMonthKey]);

  const totalCurrentMonthRevenue = useMemo(() => {
    return currentMonthApps.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  }, [currentMonthApps]);

  const activeMonthKey = selectedStatsMonth || currentMonthKey;
  const filteredMonthApps = useMemo(() => {
    return allAppointments.filter(
      (a) =>
        a.booking_date.startsWith(activeMonthKey) &&
        a.status !== "cancelled" &&
        !a.client_name.startsWith("[BLOQUEADO]")
    );
  }, [allAppointments, activeMonthKey]);

  const activeMonthRevenue = useMemo(() => {
    return filteredMonthApps.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  }, [filteredMonthApps]);

  const activeMonthAverageTicket = filteredMonthApps.length > 0
    ? (activeMonthRevenue / filteredMonthApps.length).toFixed(1)
    : "0";

  const topServiceOfMonth = useMemo(() => {
    if (filteredMonthApps.length === 0) return { name: "Sin datos", count: 0 };
    const counts: Record<string, number> = {};
    filteredMonthApps.forEach((a) => {
      counts[a.service_name] = (counts[a.service_name] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { name: sorted[0][0], count: sorted[0][1] };
  }, [filteredMonthApps]);

  const monthlyHistory = useMemo(() => {
    const map: Record<string, { monthKey: string; revenue: number; cuts: number }> = {};
    allAppointments
      .filter((a) => a.status !== "cancelled" && !a.client_name.startsWith("[BLOQUEADO]"))
      .forEach((a) => {
        const m = a.booking_date.substring(0, 7);
        if (!map[m]) map[m] = { monthKey: m, revenue: 0, cuts: 0 };
        map[m].revenue += Number(a.price) || 0;
        map[m].cuts += 1;
      });

    const list = Object.values(map).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    if (!map[currentMonthKey]) {
      list.push({ monthKey: currentMonthKey, revenue: 0, cuts: 0 });
    }
    return list;
  }, [allAppointments, currentMonthKey]);

  const maxHistoricalRevenue = useMemo(() => {
    return Math.max(...monthlyHistory.map((m) => m.revenue), 100);
  }, [monthlyHistory]);

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
            Entrar a la Agenda
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes barberPoleMove {
          0% { background-position: 0 0; }
          100% { background-position: 40px 0; }
        }
        .barber-pole-stripe {
          background: repeating-linear-gradient(
            -45deg,
            #ef4444,
            #ef4444 10px,
            #ffffff 10px,
            #ffffff 20px,
            #3b82f6 20px,
            #3b82f6 30px,
            #ffffff 30px,
            #ffffff 40px
          );
          background-size: 56px 100%;
          animation: barberPoleMove 1.5s linear infinite;
        }
        @keyframes adminTicker {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .admin-marquee {
          display: flex;
          width: 200%;
          animation: adminTicker 22s linear infinite;
        }
      ` }} />

      <div className="w-full max-w-2xl h-1.5 barber-pole-stripe opacity-90 shadow-sm" />

      {/* CINTA MARQUEE */}
      <div className="w-full max-w-2xl overflow-hidden bg-zinc-900 border-b border-zinc-800 py-1 select-none text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">
        <div className="admin-marquee">
          <div className="flex items-center gap-6 whitespace-nowrap">
            <span className="text-amber-400 font-bold">💈 PANEL JBARBERS EN VIVO</span>
            <span>•</span>
            <span>📅 {selectedDate}</span>
            <span>•</span>
            <span>👥 {activeAppointments.length} HOY</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">💰 HOY: {totalDayRevenue} €</span>
            <span>•</span>
            <span className="text-amber-300 font-bold">📋 {waitlistEntries.length} EN ESPERA</span>
            <span>•</span>
            <span>📍 PIORNAL</span>
            <span>•</span>
          </div>
          <div className="flex items-center gap-6 whitespace-nowrap pl-6">
            <span className="text-amber-400 font-bold">💈 PANEL JBARBERS EN VIVO</span>
            <span>•</span>
            <span>📅 {selectedDate}</span>
            <span>•</span>
            <span>👥 {activeAppointments.length} HOY</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">💰 HOY: {totalDayRevenue} €</span>
            <span>•</span>
            <span className="text-amber-300 font-bold">📋 {waitlistEntries.length} EN ESPERA</span>
            <span>•</span>
            <span>📍 PIORNAL</span>
            <span>•</span>
          </div>
        </div>
      </div>

      {/* CABECERA CON PESTAÑAS (AGENDA vs LISTA DE ESPERA) */}
      <header className="w-full max-w-2xl bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-20 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-black text-amber-400 tracking-wider">JBARBERS • CONTROL</h1>
            <p className="text-[11px] text-zinc-400">Sincronización en tiempo real</p>
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
                  <span>Bloquear</span>
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

        {/* PESTAÑAS PRINCIPALES */}
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

        {/* SELECTOR RÁPIDO DE FECHA (SOLO EN VISTA AGENDA) */}
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
                  <span>Cerrar día entero</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="w-full max-w-2xl p-4 space-y-4">
        
        {/* VISTA 1: AGENDA DEL DÍA */}
        {currentView === "agenda" && (
          <>
            {/* CAJAS: HOY Y MES */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl shadow-md">
                <div className="flex items-center justify-between text-zinc-400 text-xs">
                  <span>Caja de Hoy</span>
                  <span className="text-emerald-400 font-black text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {activeAppointments.length} cortes
                  </span>
                </div>
                <p className="text-2xl font-black text-emerald-400 mt-1">{totalDayRevenue} €</p>
              </div>

              <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/30 border border-amber-500/30 p-3.5 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Caja del Mes
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {currentMonthApps.length} cortes
                  </span>
                </div>

                <div className="my-1">
                  <p className="text-2xl font-black text-amber-300">{totalCurrentMonthRevenue} €</p>
                </div>

                <button
                  onClick={() => {
                    setSelectedStatsMonth(currentMonthKey);
                    setShowMonthlyModal(true);
                  }}
                  className="w-full mt-1 py-1.5 px-2 bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 border border-amber-500/30 rounded-xl text-[11px] font-bold text-amber-300 flex items-center justify-between transition"
                >
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" /> Ver Esquema Mensual
                  </span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* TIMELINE VISUAL */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-200">Distribución de horas del día</span>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Libre</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Ocupada</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-600" /> Bloqueo</span>
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

            {/* BUSCADOR */}
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

            {/* LISTADO DE CITAS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Agenda del día ({filteredAppointments.length})
                </h2>
                <span className="text-[11px] text-zinc-500 font-semibold">{selectedDate}</span>
              </div>

              {loading ? (
                <div className="text-center py-10 text-xs text-zinc-500">Actualizando agenda en vivo...</div>
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
                    + Añadir una cita manual
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
                          title="Liberar hora"
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
                          ? "bg-rose-950/20 border-rose-500/70 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                          : app.status === "cancelled"
                          ? "bg-zinc-900/40 border-zinc-900 opacity-60"
                          : app.status === "pending"
                          ? "bg-amber-950/15 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                          : app.status === "completed"
                          ? "bg-emerald-950/10 border-emerald-900/40"
                          : "bg-zinc-900 border-zinc-800"
                      }`}
                    >
                      {isDuplicate && (
                        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-[11px] text-rose-300 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>⚠️ HORA DUPLICADA: Coincide con otro cliente a las {app.booking_time} h</span>
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
                            title="Ver historial del cliente"
                          >
                            <span>{app.client_name}</span>
                            <History className="w-3 h-3 text-zinc-500" />
                          </button>

                          <p className="text-xs text-zinc-400">
                            {app.service_name} • <strong className="text-zinc-200">{app.price} €</strong>
                          </p>

                          {app.notes && (
                            <p className="text-xs text-zinc-400 bg-zinc-950/80 p-2 rounded-xl border border-zinc-800 mt-2">
                              💬 Nota: {app.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {app.client_phone !== "En local" && (
                            <a
                              href={`tel:${app.client_phone}`}
                              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 rounded-xl transition"
                              title="Llamar"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteAppointment(app.id, false)}
                            className="p-2 bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-700 rounded-xl transition"
                            title="Eliminar cita"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* BOTONES DE ACCIÓN: ACEPTAR CITA / RECORDAR / RETRASO */}
                      <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                        {app.status === "pending" ? (
                          <div className="w-full flex items-center gap-2">
                            <button
                              onClick={() => handleAcceptAppointment(app)}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/30 active:scale-95"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Aceptar Cita y Confirmar por WhatsApp</span>
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
                                  title="Avisar que vas con 10 min de retraso"
                                >
                                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                                  <span>+10 min</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-500 italic">
                                {app.status === "cancelled" ? "Cita cancelada" : "Cita en persona"}
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

        {/* VISTA 2: LISTA DE ESPERA ORDENADA CRONOLÓGICAMENTE */}
        {currentView === "waitlist" && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-md space-y-1">
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-400" />
                <span>Lista de Espera en Vivo ({waitlistEntries.length})</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Ordenados por turno de llegada: el primer cliente de la lista es el que antes pidió hueco.
              </p>
            </div>

            {waitlistEntries.length === 0 ? (
              <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500 space-y-1">
                <p>No hay clientes en lista de espera actualmente.</p>
                <p className="text-[11px] text-zinc-600">Cuando un cliente se apunte en un día completo, aparecerá aquí al instante.</p>
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
                      className="bg-zinc-900 border border-zinc-800 hover:border-amber-500/30 rounded-2xl p-4 shadow-lg flex flex-col space-y-2 transition"
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
                            Apuntado a las {requestTime} h
                          </p>
                        </div>
                      </div>

                      {entry.notes && (
                        <p className="text-xs text-zinc-400 bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                          💬 Preferencia: {entry.notes}
                        </p>
                      )}

                      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleContactWaitlistClient(entry)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span>Avisar Hueco por WhatsApp</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${entry.client_phone}`}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 rounded-xl transition"
                            title="Llamar"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteWaitlistEntry(entry.id)}
                            className="p-1.5 bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-700 rounded-xl transition"
                            title="Eliminar de lista"
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

      {/* MODAL: ESQUEMA INTERACTIVO MENSUAL */}
      {showMonthlyModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-zinc-900 border border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-[0_0_35px_rgba(245,158,11,0.25)] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-100">Esquema Mensual de Caja</h3>
                  <p className="text-[10px] text-amber-400 font-semibold">{getMonthLabel(activeMonthKey)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMonthlyModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4 flex-1">
              <div className="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800 space-y-2">
                <span className="text-[11px] font-bold text-zinc-400">Selecciona o compara meses:</span>
                
                <div className="flex items-end gap-2 pt-4 pb-1 h-32 px-2 overflow-x-auto">
                  {monthlyHistory.map((m) => {
                    const isSelected = m.monthKey === activeMonthKey;
                    const heightPercent = Math.max(Math.round((m.revenue / maxHistoricalRevenue) * 100), 12);

                    return (
                      <button
                        key={m.monthKey}
                        onClick={() => setSelectedStatsMonth(m.monthKey)}
                        className="flex-1 min-w-[50px] flex flex-col items-center justify-end h-full group transition"
                      >
                        <span className={`text-[10px] font-bold mb-1 transition ${isSelected ? "text-amber-400" : "text-zinc-500 group-hover:text-zinc-300"}`}>
                          {m.revenue}€
                        </span>
                        
                        <div className="w-full bg-zinc-850 rounded-t-lg overflow-hidden flex items-end h-20 p-0.5">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t transition-all duration-300 ${
                              isSelected
                                ? "bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                                : "bg-zinc-700 hover:bg-zinc-600"
                            }`}
                          />
                        </div>

                        <span className={`text-[9px] font-mono mt-1 transition ${isSelected ? "text-amber-400 font-bold" : "text-zinc-500"}`}>
                          {m.monthKey.slice(5)}/{m.monthKey.slice(2, 4)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Total Caja</p>
                  <p className="text-base font-black text-amber-400 mt-0.5">{activeMonthRevenue} €</p>
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Cortes</p>
                  <p className="text-base font-black text-zinc-100 mt-0.5">{filteredMonthApps.length}</p>
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Ticket Medio</p>
                  <p className="text-base font-black text-emerald-400 mt-0.5">{activeMonthAverageTicket} €</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 p-3 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Corte Más Pedido</p>
                    <p className="text-xs font-bold text-zinc-100">{topServiceOfMonth.name}</p>
                  </div>
                </div>
                <span className="text-xs font-black text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md">
                  {topServiceOfMonth.count} veces
                </span>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-bold text-zinc-300">
                  Detalle de citas de {getMonthLabel(activeMonthKey)} ({filteredMonthApps.length}):
                </p>
                
                {filteredMonthApps.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic p-3 bg-zinc-950 rounded-xl text-center">
                    No hay citas registradas en este mes.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {filteredMonthApps.map((a) => (
                      <div
                        key={a.id}
                        className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-850 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-zinc-200">{a.client_name}</p>
                          <p className="text-[10px] text-zinc-500">
                            {a.booking_date} a las {a.booking_time} h • {a.service_name}
                          </p>
                        </div>
                        <span className="font-black text-emerald-400">{a.price} €</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowMonthlyModal(false)}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 rounded-xl text-xs font-bold transition"
            >
              Cerrar Esquema
            </button>
          </div>
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
              Vas a anular la cita de <strong className="text-white">{cancelModalApp.client_name}</strong> para las <strong>{cancelModalApp.booking_time} h</strong>.
            </p>

            <div>
              <label className="text-xs font-semibold text-zinc-400">Motivo para el mensaje de disculpa:</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej: un imprevisto médico, descanso..."
                className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleConfirmCancellation(true)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Anular y avisar por WhatsApp</span>
              </button>

              <button
                onClick={() => handleConfirmCancellation(false)}
                className="w-full py-2 bg-zinc-800 hover:bg-rose-950 text-rose-400 rounded-xl text-xs font-semibold transition"
              >
                Anular sin enviar WhatsApp
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
              <p className="text-xs font-semibold text-zinc-400">Historial de citas:</p>
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
              Cerrar ficha
            </button>
          </div>
        </div>
      )}

      {/* MODAL: BLOQUEAR HORA */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={async (e) => {
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
              if (error) alert("Error al bloquear: " + error.message);
              setShowBlockModal(false);
              fetchAllData();
            }}
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <ShieldBan className="w-4 h-4 text-amber-400" /> Bloquear una hora
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

              <div>
                <label className="text-xs font-semibold text-zinc-300">Hora:</label>
                <select
                  value={blockTime}
                  onChange={(e) => setBlockTime(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm text-zinc-100 focus:outline-none"
                >
                  {allSlots.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Motivo (solo para ti):</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ej: Médico, descanso..."
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm text-zinc-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowBlockModal(false)} className="w-1/2 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold">Cancelar</button>
              <button type="submit" className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold">Bloquear</button>
            </div>
          </form>
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

              if (error) alert("Error al guardar cita: " + error.message);

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
              <button type="submit" className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold">Guardar Cita</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}