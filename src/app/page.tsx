"use client";

import { useState, useMemo } from "react";
import { SERVICES, BARBER_INFO, Service } from "@/data/services";
import { 
  Scissors, 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  Phone, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft,
  Sparkles,
  MessageCircle,
  MapPin,
  ShieldAlert,
  Info
} from "lucide-react";

export default function BarberApp() {
  const [activeTab, setActiveTab] = useState<"book" | "about" | "policy">("book");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");

  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    let count = 0;
    let dayOffset = 0;

    while (count < 10) {
      const d = new Date();
      d.setDate(today.getDate() + dayOffset);
      const dayOfWeek = d.getDay();

      if (BARBER_INFO.workingDays.includes(dayOfWeek)) {
        dates.push({
          iso: d.toISOString().split("T")[0],
          dayName: d.toLocaleDateString("es-ES", { weekday: "short" }),
          dayNumber: d.getDate(),
          monthName: d.toLocaleDateString("es-ES", { month: "short" }),
        });
        count++;
      }
      dayOffset++;
    }
    return dates;
  }, []);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    let currentHour = BARBER_INFO.schedule.startHour;
    let currentMinute = 0;

    while (
      currentHour < BARBER_INFO.schedule.endHour ||
      (currentHour === BARBER_INFO.schedule.endHour && currentMinute < BARBER_INFO.schedule.endMinute)
    ) {
      slots.push(`${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`);
      currentMinute += BARBER_INFO.schedule.slotMinutes;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
    }
    return slots;
  }, []);
const handleConfirmToWhatsApp = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !clientName || !clientPhone) {
      alert("Por favor completa todos los campos requeridos.");
      return;
    }

    try {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase.from("appointments").insert([
        {
          client_name: clientName,
          client_phone: clientPhone,
          service_name: selectedService.name,
          price: selectedService.price,
          booking_date: selectedDate,
          booking_time: selectedTime,
          notes: notes.trim() || null,
          status: "pending",
        },
      ]);

      if (error) {
        console.error("Error en Supabase:", error.message);
      }
    } catch (err) {
      console.error("Error de conexión:", err);
    }

    const message = 
      `💈 *SOLICITUD DE CITA - ${BARBER_INFO.name.toUpperCase()}* 💈\n\n` +
      `✂️ *Servicio:* ${selectedService.name} (${selectedService.price} €)\n` +
      `⏱️ *Duración:* ${selectedService.duration} min\n` +
      `📅 *Fecha:* ${selectedDate}\n` +
      `⏰ *Hora:* ${selectedTime} h\n\n` +
      `👤 *Cliente:* ${clientName}\n` +
      `📱 *Teléfono:* ${clientPhone}\n` +
      (notes.trim() ? `📝 *Detalle:* ${notes}\n\n` : "\n") +
      `¿Me confirmas disponibilidad? ¡Gracias!`;

    window.open(`https://wa.me/${BARBER_INFO.phone}?text=${encodeURIComponent(message)}`, "_blank");
    setStep(4);
  };
  
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex justify-center selection:bg-amber-500 selection:text-black">
      <main className="w-full max-w-md min-h-screen flex flex-col bg-zinc-900 border-x border-zinc-800 shadow-2xl">
        
        {/* CABECERA CON PERFIL DE LA BARBERÍA */}
        <header className="p-5 border-b border-zinc-800 bg-zinc-900/95 sticky top-0 z-20 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xl">
                <Scissors className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-zinc-100 leading-tight">{BARBER_INFO.name}</h1>
                <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-amber-400" /> Tu localidad • Barbería
                </p>
              </div>
            </div>
            <a 
  href="https://instagram.com" 
  target="_blank" 
  rel="noreferrer"
  className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-amber-400 transition"
  aria-label="Instagram"
>
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
</a>
          </div>

          {/* SELECTOR DE PESTAÑAS */}
          <div className="grid grid-cols-3 gap-1 bg-zinc-950/70 p-1 rounded-xl border border-zinc-800/80 mt-4 text-xs font-medium">
            <button
              onClick={() => setActiveTab("book")}
              className={`py-1.5 rounded-lg transition ${activeTab === "book" ? "bg-amber-500 text-black font-semibold shadow" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              Reservar
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`py-1.5 rounded-lg transition ${activeTab === "about" ? "bg-amber-500 text-black font-semibold shadow" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              Barbería
            </button>
            <button
              onClick={() => setActiveTab("policy")}
              className={`py-1.5 rounded-lg transition ${activeTab === "policy" ? "bg-amber-500 text-black font-semibold shadow" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              Normas
            </button>
          </div>
        </header>

        {/* CONTENIDO SEGÚN LA PESTAÑA */}
        <div className="p-5 flex-1 flex flex-col justify-between">
          
          {/* PESTAÑA 1: RESERVA */}
          {activeTab === "book" && (
            <div>
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-zinc-100">Servicios disponibles</h2>
                      <p className="text-xs text-zinc-400">Selecciona el corte o arreglo</p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      16:00 - 19:30
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {SERVICES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedService(s); setStep(2); }}
                        className="w-full text-left p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:border-amber-500/50 hover:bg-zinc-800/40 transition flex items-center justify-between group"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm text-zinc-200 group-hover:text-amber-400 transition-colors">{s.name}</span>
                            {s.popular && (
                              <span className="flex items-center text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                                <Sparkles className="w-2.5 h-2.5 mr-1" /> Top
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5 text-xs text-zinc-400 mt-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{s.duration} min</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-base text-zinc-100">{s.price} €</span>
                          <span className="block text-[11px] text-amber-500">Reservar →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <button onClick={() => setStep(1)} className="inline-flex items-center text-xs text-zinc-400 hover:text-zinc-200">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Volver a servicios
                  </button>

                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex justify-between items-center text-xs">
                    <span className="text-amber-400 font-semibold">{selectedService?.name}</span>
                    <span className="font-bold text-zinc-100">{selectedService?.price} €</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-2 flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-amber-400" /> Elige fecha
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {availableDates.map((d) => (
                        <button
                          key={d.iso}
                          onClick={() => setSelectedDate(d.iso)}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center transition ${
                            selectedDate === d.iso
                              ? "border-amber-500 bg-amber-500 text-black font-bold"
                              : "border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-700"
                          }`}
                        >
                          <span className="text-[10px] uppercase">{d.dayName}</span>
                          <span className="text-base font-bold">{d.dayNumber}</span>
                          <span className="text-[10px] opacity-70">{d.monthName}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-2 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" /> Horas libres
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                            selectedTime === time
                              ? "border-amber-500 bg-amber-500 text-black"
                              : "border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-700"
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    disabled={!selectedDate || !selectedTime}
                    onClick={() => setStep(3)}
                    className="w-full py-3.5 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none transition"
                  >
                    Continuar con mis datos
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <button onClick={() => setStep(2)} className="inline-flex items-center text-xs text-zinc-400 hover:text-zinc-200">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Volver a horario
                  </button>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Servicio:</span>
                      <span className="font-semibold text-zinc-200">{selectedService?.name} ({selectedService?.price} €)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Fecha y hora:</span>
                      <span className="font-semibold text-amber-400">{selectedDate} a las {selectedTime} h</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-zinc-300 block mb-1">Nombre y apellidos *</label>
                      <input
                        type="text"
                        placeholder="Ej: Marcos Pérez"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-zinc-300 block mb-1">Teléfono móvil *</label>
                      <input
                        type="tel"
                        placeholder="Ej: 612 345 678"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-zinc-300 block mb-1">Indicaciones (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Detalle sobre el corte o arreglo"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmToWhatsApp}
                    disabled={!clientName.trim() || !clientPhone.trim()}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 disabled:opacity-40 transition flex items-center justify-center space-x-2"
                  >
                    <MessageCircle className="w-5 h-5 fill-current" />
                    <span>Enviar reserva al barbero</span>
                  </button>
                </div>
              )}

              {step === 4 && (
                <div className="text-center py-10 space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h2 className="text-lg font-bold text-zinc-100">¡Petición preparada!</h2>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                    Se abrirá WhatsApp para que el barbero valide tu hueco en agenda.
                  </p>
                  <button
                    onClick={() => {
                      setStep(1);
                      setSelectedService(null);
                      setSelectedDate("");
                      setSelectedTime("");
                      setClientName("");
                      setClientPhone("");
                    }}
                    className="text-xs text-amber-400 underline block pt-2 mx-auto"
                  >
                    Hacer otra reserva
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 2: INFORMACIÓN DE LA BARBERÍA */}
          {activeTab === "about" && (
            <div className="space-y-4 text-xs leading-relaxed text-zinc-300">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <Info className="w-4 h-4" />
                  <span>Sobre Jbarbers</span>
                </div>
                <p>
                  Especialistas en degradados modernos, arreglos de barba tradicionales y cortes clásicos adaptados a tu estilo personal con atención detallada.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h3 className="font-semibold text-zinc-100 text-sm flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" /> Horario de citas
                </h3>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span>Lunes a Viernes</span>
                  <span className="text-amber-400 font-medium">16:00 - 19:30</span>
                </div>
                <div className="flex justify-between py-1 text-zinc-500">
                  <span>Sábado y Domingo</span>
                  <span>Cerrado</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h3 className="font-semibold text-zinc-100 text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400" /> Localización y contacto
                </h3>
                <p className="text-zinc-400">Visítanos o escríbenos directamente para dudas o citas personalizadas.</p>
                <a
                  href={`https://wa.me/${BARBER_INFO.phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium flex items-center justify-center gap-2 text-xs transition"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" /> Contactar por WhatsApp
                </a>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: POLÍTICAS Y NORMAS */}
          {activeTab === "policy" && (
            <div className="space-y-4 text-xs text-zinc-300">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Puntualidad</span>
                </div>
                <p>
                  Para garantizar la atención de todos los clientes, rogamos llegar a la hora exacta. Un retraso superior a 10 minutos puede reducir la duración del servicio o requerir reprogramación.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h3 className="font-semibold text-zinc-100 text-sm">Cancelaciones y avisos</h3>
                <p>
                  Si no puedes asistir, por favor avisa con al menos 2 horas de antelación vía WhatsApp para poder ofrecer el hueco a otro cliente.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h3 className="font-semibold text-zinc-100 text-sm">Métodos de pago</h3>
                <p>Aceptamos pago en efectivo y Bizum al finalizar el servicio.</p>
              </div>
            </div>
          )}

        </div>

        {/* PIE */}
        <footer className="p-3 border-t border-zinc-800 text-center text-[10px] text-zinc-500">
          {BARBER_INFO.name} • Reservas online
        </footer>
      </main>
    </div>
  );
}