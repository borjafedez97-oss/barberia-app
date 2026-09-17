"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { BARBER_INFO, SERVICES, Service } from "@/data/services";
import { supabase } from "@/lib/supabase";
import { 
  Scissors, 
  Calendar as CalendarIcon, 
  User, 
  Phone, 
  FileText, 
  CheckCircle2, 
  MapPin, 
  Sun, 
  Moon, 
  MessageCircle, 
  ChevronRight, 
  ArrowLeft,
  Flame,
  Clock,
  Sparkles,
  AlertCircle
} from "lucide-react";

function InstagramIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

// Micro-vibración háptica para el móvil
const triggerHaptic = (ms = 15) => {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      // Ignorar si el navegador no lo soporta
    }
  }
};

export default function BookingPage() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [step, setStep] = useState<number>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [todayFreeSlots, setTodayFreeSlots] = useState<string[]>([]);
  const [clientName, setClientName] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState<boolean>(false);
  const [waitlistName, setWaitlistName] = useState<string>("");

  const allSlots = [...BARBER_INFO.morningSlots, ...BARBER_INFO.afternoonSlots];

  // 1. Pantalla Splash Screen inicial elegante
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  // 2. Consultar huecos ocupados para el día seleccionado
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchOccupiedSlots() {
      const { data, error } = await supabase
        .from("appointments")
        .select("booking_time")
        .eq("booking_date", selectedDate)
        .neq("status", "cancelled");

      const occupied = !error && data ? data.map((item) => item.booking_time) : [];
      setBookedSlots(occupied);

      const todayStr = new Date().toISOString().split("T")[0];
      if (selectedDate === todayStr) {
        const freeNow = allSlots.filter((slot) => !occupied.includes(slot));
        setTodayFreeSlots(freeNow);
      }
    }

    fetchOccupiedSlots();
  }, [selectedDate]);

  // Confirmar y registrar reserva
  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !clientName.trim() || !clientPhone.trim()) {
      alert("Por favor completa los datos de contacto.");
      return;
    }

    triggerHaptic(30);
    setIsSubmitting(true);

    try {
      await supabase.from("appointments").insert([
        {
          client_name: clientName.trim(),
          client_phone: clientPhone.trim(),
          service_name: selectedService.name,
          price: selectedService.price,
          booking_date: selectedDate,
          booking_time: selectedTime,
          notes: notes.trim() || null,
          status: "pending",
        },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }

    const message =
      `💈 *SOLICITUD DE CITA - ${BARBER_INFO.name.toUpperCase()}* 💈\n\n` +
      `✂️ *Servicio:* ${selectedService.name} (${selectedService.price} €)\n` +
      `⏱️ *Duración:* ${selectedService.duration} min\n` +
      `📅 *Fecha:* ${selectedDate}\n` +
      `⏰ *Hora:* ${selectedTime} h\n\n` +
      `👤 *Cliente:* ${clientName.trim()}\n` +
      `📱 *Teléfono:* ${clientPhone.trim()}\n` +
      (notes.trim() ? `📝 *Nota:* ${notes.trim()}\n\n` : "\n") +
      `¿Me confirmas disponibilidad? ¡Gracias!`;

    window.open(`https://wa.me/${BARBER_INFO.phone}?text=${encodeURIComponent(message)}`, "_blank");
    setStep(4);
  };

  // Enviar a Lista de Espera por WhatsApp
  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistName.trim()) return;

    triggerHaptic(20);
    const msg =
      `💈 *LISTA DE ESPERA - JBARBERS* 💈\n\n` +
      `¡Buenas! He visto que el día *${selectedDate}* está completo.\n` +
      `Soy *${waitlistName.trim()}*. Si te falla alguien o tienes alguna cancelación a última hora, ¡avísame por favor y me acerco! Gracias.`;

    window.open(`https://wa.me/${BARBER_INFO.phone}?text=${encodeURIComponent(msg)}`, "_blank");
    setShowWaitlistModal(false);
    setWaitlistName("");
  };

  // 1. PANTALLA SPLASH SCREEN
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center z-50 transition-opacity">
        <div className="relative w-36 h-20 animate-pulse">
          <Image src="/logo.png" alt="JBarbers" fill priority className="object-contain" />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <p className="text-xs uppercase tracking-widest text-amber-400 font-bold">JBarbers Piornal</p>
        </div>
      </div>
    );
  }

  const freeCount = allSlots.length - bookedSlots.length;
  const isAllDayFull = freeCount === 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center selection:bg-amber-500 selection:text-black">
      {/* HEADER CON FOTO Y LOGO */}
      <header className="relative w-full max-w-lg overflow-hidden border-b border-zinc-800 bg-zinc-900">
        <div className="relative h-52 w-full">
          <Image
            src="/hero.jpg"
            alt="JBarbers Piornal"
            fill
            priority
            className="object-cover object-top opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
        </div>

        {/* INDICADOR EN VIVO (LIVE BADGE) */}
        <div className="absolute top-3 left-3 z-10">
          {todayFreeSlots.length > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-[11px] font-semibold shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Hoy hueco libre: {todayFreeSlots[0]} h</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/80 backdrop-blur-md border border-amber-500/40 text-amber-400 text-[11px] font-semibold shadow-lg">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Abierto hoy en Piornal</span>
            </div>
          )}
        </div>

        <div className="relative -mt-16 px-5 pb-4 text-center flex flex-col items-center">
          <div className="relative w-32 h-16 mb-2">
            <Image
              src="/logo.png"
              alt="Logo JBarbers"
              fill
              className="object-contain filter drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
            />
          </div>

          <h1 className="text-2xl font-black tracking-wider uppercase text-amber-400">
            {BARBER_INFO.name}
          </h1>
          <p className="text-xs text-zinc-400 max-w-xs mt-0.5">
            Cortes degradados, estilo urbano y perfilado clásico
          </p>

          <div className="flex items-center gap-2 mt-3">
            <a
              href={BARBER_INFO.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-[11px] border border-zinc-700/60 transition"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Piornal (Cómo llegar)</span>
            </a>

            <a
              href={BARBER_INFO.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-[11px] border border-zinc-700/60 transition"
            >
              <InstagramIcon className="w-3.5 h-3.5 text-rose-400" />
              <span>@{BARBER_INFO.instagram}</span>
            </a>
          </div>
        </div>

        {step < 4 && (
          <div className="grid grid-cols-3 text-center border-t border-zinc-800/80 bg-zinc-950/70 text-[11px] py-2">
            <span className={step >= 1 ? "text-amber-400 font-bold" : "text-zinc-600"}>1. Servicio</span>
            <span className={step >= 2 ? "text-amber-400 font-bold" : "text-zinc-600"}>2. Fecha y Hora</span>
            <span className={step >= 3 ? "text-amber-400 font-bold" : "text-zinc-600"}>3. Datos</span>
          </div>
        )}
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="w-full max-w-lg p-5 flex-1 flex flex-col justify-between">
        
        {/* PASO 1: SELECCIONAR SERVICIO */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-wide uppercase text-zinc-300 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-400" /> Elige tu servicio
              </h2>
              <span className="text-[11px] text-zinc-500">{SERVICES.length} opciones</span>
            </div>

            <div className="grid gap-2.5">
              {SERVICES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    triggerHaptic(15);
                    setSelectedService(s);
                    setStep(2);
                  }}
                  className="text-left p-3.5 rounded-xl border bg-zinc-900/80 hover:bg-zinc-850 border-zinc-800/80 text-zinc-200 transition flex items-center justify-between relative overflow-hidden group"
                >
                  {s.popular && (
                    <span className="absolute top-0 right-0 bg-amber-500 text-zinc-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> Top
                    </span>
                  )}
                  <div>
                    <h3 className="font-semibold text-sm text-zinc-100">{s.name}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{s.description}</p>
                    <span className="text-[11px] text-zinc-500 mt-1 inline-block">
                      ⏱️ {s.duration} min
                    </span>
                  </div>
                  <div className="text-right pl-3 flex items-center gap-2">
                    <span className="text-base font-extrabold text-amber-400">{s.price} €</span>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2: FECHA Y HORA CON LLAMA 🔥 Y LISTA DE ESPERA */}
        {step === 2 && selectedService && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  triggerHaptic(10);
                  setStep(1);
                }}
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-400"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Cambiar servicio
              </button>
              <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                {selectedService.name} ({selectedService.price} €)
              </span>
            </div>

            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-amber-400" /> Selecciona el día:
                </label>
                <span className="text-[11px] text-zinc-400">
                  {isAllDayFull ? "⚠️ Todo completo" : `${freeCount} huecos libres`}
                </span>
              </div>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  triggerHaptic(10);
                  setSelectedDate(e.target.value);
                  setSelectedTime("");
                }}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {isAllDayFull ? (
              <div className="bg-zinc-900/60 border border-dashed border-zinc-800 rounded-xl p-5 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">No quedan horas libres para este día</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                    ¿Quieres que el barbero te avise si alguien cancela su cita a última hora?
                  </p>
                </div>
                <button
                  onClick={() => setShowWaitlistModal(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition"
                >
                  📋 Apuntarme a la lista de espera
                </button>
              </div>
            ) : (
              <>
                {/* HORAS MAÑANA */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" /> Mañanas
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {BARBER_INFO.morningSlots.map((time) => {
                      const isBooked = bookedSlots.includes(time);
                      const isSelected = selectedTime === time;
                      const isNextToday = todayFreeSlots[0] === time;

                      return (
                        <button
                          key={time}
                          disabled={isBooked}
                          onClick={() => {
                            triggerHaptic(15);
                            setSelectedTime(time);
                          }}
                          className={`py-2 text-xs rounded-lg font-medium border transition relative flex items-center justify-center gap-1 ${
                            isBooked
                              ? "bg-zinc-900/40 border-zinc-900 text-zinc-600 line-through cursor-not-allowed"
                              : isSelected
                              ? "bg-amber-500 text-zinc-950 font-bold border-amber-400 shadow-md shadow-amber-500/20"
                              : isNextToday
                              ? "bg-zinc-900 border-amber-500/60 text-amber-400 font-semibold"
                              : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200"
                          }`}
                        >
                          {isNextToday && !isSelected && (
                            <Flame className="w-3 h-3 text-amber-400 fill-current animate-bounce" />
                          )}
                          <span>{time}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* HORAS TARDE */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" /> Tardes
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {BARBER_INFO.afternoonSlots.map((time) => {
                      const isBooked = bookedSlots.includes(time);
                      const isSelected = selectedTime === time;
                      const isNextToday = todayFreeSlots[0] === time;

                      return (
                        <button
                          key={time}
                          disabled={isBooked}
                          onClick={() => {
                            triggerHaptic(15);
                            setSelectedTime(time);
                          }}
                          className={`py-2 text-xs rounded-lg font-medium border transition relative flex items-center justify-center gap-1 ${
                            isBooked
                              ? "bg-zinc-900/40 border-zinc-900 text-zinc-600 line-through cursor-not-allowed"
                              : isSelected
                              ? "bg-amber-500 text-zinc-950 font-bold border-amber-400 shadow-md shadow-amber-500/20"
                              : isNextToday
                              ? "bg-zinc-900 border-amber-500/60 text-amber-400 font-semibold"
                              : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200"
                          }`}
                        >
                          {isNextToday && !isSelected && (
                            <Flame className="w-3 h-3 text-amber-400 fill-current animate-bounce" />
                          )}
                          <span>{time}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <button
                    onClick={() => setShowWaitlistModal(true)}
                    className="text-[11px] text-zinc-400 hover:text-amber-400 underline transition"
                  >
                    ¿No encuentras una hora que te venga bien? Avísame si hay bajas
                  </button>
                </div>
              </>
            )}

            <button
              disabled={!selectedTime}
              onClick={() => {
                triggerHaptic(20);
                setStep(3);
              }}
              className={`w-full py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
                selectedTime
                  ? "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              <span>Continuar ({selectedTime || "--:--"})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* PASO 3: FORMULARIO */}
        {step === 3 && selectedService && (
          <div className="space-y-4">
            <button
              onClick={() => {
                triggerHaptic(10);
                setStep(2);
              }}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-400"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Modificar fecha u hora
            </button>

            <div className="bg-zinc-900/90 p-4 rounded-xl border border-zinc-800 text-xs space-y-1.5">
              <div className="flex justify-between text-zinc-300">
                <span>Servicio:</span>
                <span className="font-bold text-zinc-100">{selectedService.name}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Fecha y Hora:</span>
                <span className="font-bold text-amber-400">{selectedDate} a las {selectedTime} h</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Precio:</span>
                <span className="font-bold text-zinc-100">{selectedService.price} €</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1 mb-1">
                  <User className="w-3.5 h-3.5 text-amber-400" /> Nombre y Apellidos *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Marcos García"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1 mb-1">
                  <Phone className="w-3.5 h-3.5 text-amber-400" /> Teléfono de contacto *
                </label>
                <input
                  type="tel"
                  placeholder="Ej: 612345678"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1 mb-1">
                  <FileText className="w-3.5 h-3.5" /> Nota opcional para el barbero
                </label>
                <input
                  type="text"
                  placeholder="Ej: Solo degradar laterales..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              disabled={!clientName.trim() || !clientPhone.trim() || isSubmitting}
              onClick={handleConfirmBooking}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
                clientName.trim() && clientPhone.trim() && !isSubmitting
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>{isSubmitting ? "Registrando cita..." : "Confirmar y enviar por WhatsApp"}</span>
            </button>
          </div>
        )}

        {/* PASO 4: CONFIRMACIÓN */}
        {step === 4 && (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-xl font-bold text-zinc-100">¡Solicitud enviada!</h2>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Se ha abierto WhatsApp con los detalles de tu cita. El barbero te confirmará la reserva en cuanto lo revise.
            </p>

            <div className="pt-4">
              <button
                onClick={() => {
                  triggerHaptic(15);
                  setSelectedService(null);
                  setSelectedTime("");
                  setClientName("");
                  setClientPhone("");
                  setNotes("");
                  setStep(1);
                }}
                className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 transition"
              >
                Pedir otra cita
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: LISTA DE ESPERA */}
      {showWaitlistModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleWaitlistSubmit}
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl"
          >
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
              📋 Lista de espera para el {selectedDate}
            </h3>
            <p className="text-xs text-zinc-400">
              Indica tu nombre y se abrirá WhatsApp para avisar al barbero de que estás interesado si alguien cancela su turno.
            </p>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Tu nombre:</label>
              <input
                type="text"
                required
                placeholder="Ej: Marcos García"
                value={waitlistName}
                onChange={(e) => setWaitlistName(e.target.value)}
                className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWaitlistModal(false)}
                className="w-1/2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold"
              >
                Enviar a WhatsApp
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}