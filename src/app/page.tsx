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
  Sparkles,
  AlertCircle,
  ShieldCheck
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

const triggerHaptic = (duration = 45) => {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(duration);
    } catch {}
  }
};

const isPastSlot = (dateStr: string, slotTime: string): boolean => {
  const todayStr = new Date().toISOString().split("T")[0];
  if (dateStr !== todayStr) return false;

  const now = new Date();
  const [slotH, slotM] = slotTime.split(":").map(Number);
  const currentH = now.getHours();
  const currentM = now.getMinutes();

  if (slotH < currentH) return true;
  if (slotH === currentH && slotM <= currentM) return true;
  return false;
};

export default function BookingPage() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [splashProgress, setSplashProgress] = useState<number>(10);
  const [greeting, setGreeting] = useState<string>("Bienvenido");
  
  const [step, setStep] = useState<number>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [nextAvailableToday, setNextAvailableToday] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState<boolean>(false);
  const [waitlistName, setWaitlistName] = useState<string>("");

  const allSlots = [...BARBER_INFO.morningSlots, ...BARBER_INFO.afternoonSlots];

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);

    const hour = new Date().getHours();
    if (hour >= 6 && hour < 13) setGreeting("Buenos días ☀️");
    else if (hour >= 13 && hour < 21) setGreeting("Buenas tardes ✂️");
    else setGreeting("Buenas noches 🌙");

    const pInterval = setInterval(() => {
      setSplashProgress((prev) => (prev >= 100 ? 100 : prev + 25));
    }, 100);

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 800);

    return () => {
      clearInterval(pInterval);
      clearTimeout(timer);
    };
  }, []);

  const fetchOccupiedSlots = async () => {
    if (!selectedDate) return;

    const { data, error } = await supabase
      .from("appointments")
      .select("booking_time")
      .eq("booking_date", selectedDate)
      .neq("status", "cancelled");

    const occupied = !error && data ? data.map((item) => item.booking_time) : [];
    setBookedSlots(occupied);

    const validSlotsToday = allSlots.filter((slot) => {
      const isOccupied = occupied.includes(slot);
      const isPast = isPastSlot(selectedDate, slot);
      return !isOccupied && !isPast;
    });

    setNextAvailableToday(validSlotsToday.length > 0 ? validSlotsToday[0] : null);
  };

  useEffect(() => {
    fetchOccupiedSlots();
  }, [selectedDate]);

  // Protocolo estricto anti-solapamiento
  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !clientName.trim() || !clientPhone.trim()) {
      alert("Por favor completa los datos de contacto obligatorios.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    triggerHaptic(50);

    try {
      const { data: existingSlots, error: checkError } = await supabase
        .from("appointments")
        .select("id")
        .eq("booking_date", selectedDate)
        .eq("booking_time", selectedTime)
        .neq("status", "cancelled");

      if (checkError) throw checkError;

      if (existingSlots && existingSlots.length > 0) {
        alert(`⚠️ ¡Vaya! Justo acaban de reservar las ${selectedTime} h hace un instante. Por favor, selecciona otro hueco.`);
        setBookedSlots((prev) => [...prev, selectedTime]);
        setSelectedTime("");
        setStep(2);
        setIsSubmitting(false);
        return;
      }

      const { error: insertError } = await supabase.from("appointments").insert([
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

      if (insertError) throw insertError;

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
    } catch (err) {
      console.error(err);
      alert("Hubo un problema de conexión al registrar tu cita. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistName.trim()) return;

    triggerHaptic(40);
    const msg =
      `💈 *LISTA DE ESPERA - JBARBERS* 💈\n\n` +
      `¡Buenas! He visto que el día *${selectedDate}* está completo.\n` +
      `Soy *${waitlistName.trim()}*. Si se libera algún hueco por cancelación a última hora, ¡avísame por favor y me acerco! Gracias.`;

    window.open(`https://wa.me/${BARBER_INFO.phone}?text=${encodeURIComponent(msg)}`, "_blank");
    setShowWaitlistModal(false);
    setWaitlistName("");
  };

  // SPLASH SCREEN ELEGANTE
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center z-50">
        <div className="relative flex flex-col items-center">
          <div className="absolute -inset-10 bg-amber-500/20 blur-3xl rounded-full animate-pulse" />
          <div className="relative w-36 h-20">
            <Image src="/logo.png" alt="JBarbers" fill priority className="object-contain drop-shadow-[0_0_25px_rgba(245,158,11,0.4)]" />
          </div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-amber-400 font-bold mt-3">
            Piornal • Extremadura
          </p>
        </div>

        <div className="w-40 h-1.5 bg-zinc-900 rounded-full mt-8 overflow-hidden border border-zinc-800 shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 transition-all duration-150 rounded-full"
            style={{ width: `${splashProgress}%` }}
          />
        </div>
      </div>
    );
  }

  const availableSlotsTodayCount = allSlots.filter(
    (slot) => !bookedSlots.includes(slot) && !isPastSlot(selectedDate, slot)
  ).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center selection:bg-amber-500 selection:text-black pb-28">
      {/* ANIMACIONES CSS: BARBER POLE + MARQUEE + GOLD SHIMMER */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes tickerMove {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .marquee-container {
          display: flex;
          width: 200%;
          animation: tickerMove 20s linear infinite;
        }
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
        /* RESPLANDOR DE ORO LÍQUIDO */
        @keyframes goldShimmer {
          0% { transform: translateX(-150%) skewX(-20deg); }
          50%, 100% { transform: translateX(250%) skewX(-20deg); }
        }
        .shimmer-gold {
          position: relative;
          overflow: hidden;
        }
        .shimmer-gold::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 60%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.45),
            transparent
          );
          animation: goldShimmer 3.5s infinite ease-in-out;
          pointer-events: none;
        }
      ` }} />

      {/* TIRA TRADICIONAL DE BARBER POLE */}
      <div className="w-full max-w-lg h-1.5 barber-pole-stripe opacity-90 shadow-sm" />

      {/* CINTA MARQUEE EN MOVIMIENTO */}
      <div className="w-full max-w-lg overflow-hidden bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-zinc-950 py-1.5 border-b border-amber-400/40 shadow-lg select-none">
        <div className="marquee-container text-[11px] font-black tracking-widest uppercase">
          <div className="flex items-center gap-6 whitespace-nowrap">
            <span>💈 JBARBERS PIORNAL</span>
            <span>•</span>
            <span>⚡ RESERVA TU HUECO ONLINE</span>
            <span>•</span>
            <span>✂️ DEGRADADOS & BARBA</span>
            <span>•</span>
            <span>📍 C. HERNÁN CORTÉS 13</span>
            <span>•</span>
            <span>🔥 ESTILO URBANO & CLÁSICO</span>
            <span>•</span>
          </div>
          <div className="flex items-center gap-6 whitespace-nowrap pl-6">
            <span>💈 JBARBERS PIORNAL</span>
            <span>•</span>
            <span>⚡ RESERVA TU HUECO ONLINE</span>
            <span>•</span>
            <span>✂️ DEGRADADOS & BARBA</span>
            <span>•</span>
            <span>📍 C. HERNÁN CORTÉS 13</span>
            <span>•</span>
            <span>🔥 ESTILO URBANO & CLÁSICO</span>
            <span>•</span>
          </div>
        </div>
      </div>

      {/* HEADER DE PORTADA */}
      <header className="relative w-full max-w-lg overflow-hidden border-b border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="relative h-56 w-full">
          <Image
            src="/hero.jpg"
            alt="JBarbers Piornal"
            fill
            priority
            className="object-cover object-top opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        </div>

        {/* LIVE BADGE */}
        <div className="absolute top-3 left-3 z-10">
          {nextAvailableToday ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/85 backdrop-blur-md border border-amber-500/50 text-amber-400 text-[11px] font-semibold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>⚡ Próximo hueco hoy: {nextAvailableToday} h</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/85 backdrop-blur-md border border-zinc-700 text-zinc-300 text-[11px] font-semibold shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{greeting}</span>
            </div>
          )}
        </div>

        {/* LOGO */}
        <div className="relative -mt-16 px-5 pb-4 text-center flex flex-col items-center">
          <div className="relative w-32 h-16 mb-2 hover:scale-105 transition-transform duration-300">
            <Image
              src="/logo.png"
              alt="Logo JBarbers"
              fill
              className="object-contain filter drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)]"
            />
          </div>

          <h1 className="text-2xl font-black tracking-wider uppercase text-amber-400 drop-shadow-md">
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
              onClick={() => triggerHaptic(30)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-800/90 hover:bg-zinc-750 active:scale-95 text-zinc-300 text-[11px] border border-zinc-700 transition-all shadow-md"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Piornal (Cómo llegar)</span>
            </a>

            <a
              href={BARBER_INFO.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => triggerHaptic(30)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-800/90 hover:bg-zinc-750 active:scale-95 text-zinc-300 text-[11px] border border-zinc-700 transition-all shadow-md"
            >
              <InstagramIcon className="w-3.5 h-3.5 text-rose-400" />
              <span>@{BARBER_INFO.instagram}</span>
            </a>
          </div>
        </div>

        {step < 4 && (
          <div className="grid grid-cols-3 text-center border-t border-zinc-800 bg-zinc-950/80 text-[11px] py-2.5">
            <span className={step >= 1 ? "text-amber-400 font-bold drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-zinc-600"}>1. Servicio</span>
            <span className={step >= 2 ? "text-amber-400 font-bold drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-zinc-600"}>2. Fecha y Hora</span>
            <span className={step >= 3 ? "text-amber-400 font-bold drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-zinc-600"}>3. Confirmar</span>
          </div>
        )}
      </header>

      {/* CONTENIDO DE PASOS */}
      <main className="w-full max-w-lg p-5 flex-1 flex flex-col justify-between">
        
        {/* PASO 1: SELECCIONAR SERVICIO */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black tracking-wider uppercase text-zinc-300 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-400" /> Elige tu servicio
              </h2>
              <span className="text-[11px] text-zinc-500 font-semibold">{SERVICES.length} cortes</span>
            </div>

            <div className="grid gap-2.5">
              {SERVICES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    triggerHaptic(40);
                    setSelectedService(s);
                    setStep(2);
                  }}
                  className="text-left p-4 rounded-2xl border bg-zinc-900/90 hover:bg-zinc-850 hover:border-amber-500/40 active:scale-[0.98] border-zinc-800/90 text-zinc-200 transition-all flex items-center justify-between relative overflow-hidden group shadow-lg"
                >
                  {s.popular && (
                    <span className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-xl flex items-center gap-0.5 shadow-md">
                      <Sparkles className="w-2.5 h-2.5" /> Recomendado
                    </span>
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-zinc-100 group-hover:text-amber-400 transition-colors">
                      {s.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{s.description}</p>
                    <span className="text-[11px] text-zinc-500 mt-1 inline-block">
                      ⏱️ {s.duration} min
                    </span>
                  </div>
                  <div className="text-right pl-3 flex items-center gap-2">
                    <span className="text-base font-black text-amber-400">{s.price} €</span>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2: HORARIOS CON FILTRO INTELIGENTE */}
        {step === 2 && selectedService && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  triggerHaptic(30);
                  setStep(1);
                }}
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-400 active:scale-95 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Cambiar servicio
              </button>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                {selectedService.name} ({selectedService.price} €)
              </span>
            </div>

            <div className="bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-amber-400" /> Selecciona el día:
                </label>
                <span className="text-[11px] text-zinc-400 font-medium">
                  {availableSlotsTodayCount === 0 ? "⚠️ Día completo" : `${availableSlotsTodayCount} libres`}
                </span>
              </div>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  triggerHaptic(30);
                  setSelectedDate(e.target.value);
                  setSelectedTime("");
                }}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            {availableSlotsTodayCount === 0 ? (
              <div className="bg-zinc-900/60 border border-dashed border-zinc-800 rounded-2xl p-6 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">No quedan turnos libres para este día</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                    ¿Quieres que el barbero te avise si hay alguna baja a última hora?
                  </p>
                </div>
                <button
                  onClick={() => {
                    triggerHaptic(40);
                    setShowWaitlistModal(true);
                  }}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/20"
                >
                  📋 Entrar en lista de espera
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" /> Mañanas
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {BARBER_INFO.morningSlots.map((time) => {
                      const isBooked = bookedSlots.includes(time);
                      const isPast = isPastSlot(selectedDate, time);
                      const isUnavailable = isBooked || isPast;
                      const isSelected = selectedTime === time;
                      const isNext = nextAvailableToday === time;

                      return (
                        <button
                          key={time}
                          disabled={isUnavailable}
                          onClick={() => {
                            triggerHaptic(45);
                            setSelectedTime(time);
                          }}
                          className={`py-2 text-xs rounded-xl font-medium border transition-all relative flex items-center justify-center gap-1 active:scale-90 ${
                            isUnavailable
                              ? "bg-zinc-900/30 border-zinc-900 text-zinc-600 line-through cursor-not-allowed"
                              : isSelected
                              ? "bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                              : isNext
                              ? "bg-zinc-900 border-amber-500/70 text-amber-400 font-bold"
                              : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200"
                          }`}
                        >
                          {isNext && !isSelected && (
                            <Flame className="w-3 h-3 text-amber-400 fill-current animate-bounce" />
                          )}
                          <span>{time}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" /> Tardes
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {BARBER_INFO.afternoonSlots.map((time) => {
                      const isBooked = bookedSlots.includes(time);
                      const isPast = isPastSlot(selectedDate, time);
                      const isUnavailable = isBooked || isPast;
                      const isSelected = selectedTime === time;
                      const isNext = nextAvailableToday === time;

                      return (
                        <button
                          key={time}
                          disabled={isUnavailable}
                          onClick={() => {
                            triggerHaptic(45);
                            setSelectedTime(time);
                          }}
                          className={`py-2 text-xs rounded-xl font-medium border transition-all relative flex items-center justify-center gap-1 active:scale-90 ${
                            isUnavailable
                              ? "bg-zinc-900/30 border-zinc-900 text-zinc-600 line-through cursor-not-allowed"
                              : isSelected
                              ? "bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                              : isNext
                              ? "bg-zinc-900 border-amber-500/70 text-amber-400 font-bold"
                              : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200"
                          }`}
                        >
                          {isNext && !isSelected && (
                            <Flame className="w-3 h-3 text-amber-400 fill-current animate-bounce" />
                          )}
                          <span>{time}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* PASO 3: FORMULARIO */}
        {step === 3 && selectedService && (
          <div className="space-y-4">
            <button
              onClick={() => {
                triggerHaptic(30);
                setStep(2);
              }}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-400 active:scale-95 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Modificar fecha u hora
            </button>

            <div className="bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 text-xs space-y-1.5 shadow-lg">
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
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition"
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
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1 mb-1">
                  <FileText className="w-3.5 h-3.5" /> Nota adicional (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Solo degradar laterales..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Tu turno se bloqueará en tiempo real para evitar solapamientos.</span>
            </div>
          </div>
        )}

        {/* PASO 4: CONFIRMACIÓN */}
        {step === 4 && (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-pulse">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-xl font-bold text-zinc-100">¡Cita registrada con éxito!</h2>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Se ha abierto WhatsApp con los datos de tu reserva para que el barbero te confirme el turno.
            </p>

            <div className="pt-4">
              <button
                onClick={() => {
                  triggerHaptic(30);
                  setSelectedService(null);
                  setSelectedTime("");
                  setClientName("");
                  setClientPhone("");
                  setNotes("");
                  setStep(1);
                }}
                className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-all shadow-md"
              >
                Pedir otra cita
              </button>
            </div>
          </div>
        )}
      </main>

      {/* BARRA FLOTANTE FIJA INFERIOR (STICKY BOTTOM BAR) CON RESPLANDOR DE ORO LÍQUIDO */}
      {step === 2 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-zinc-950/85 backdrop-blur-md border-t border-zinc-800/80 z-40 flex justify-center">
          <div className="w-full max-w-lg">
            <button
              disabled={!selectedTime}
              onClick={() => {
                triggerHaptic(50);
                setStep(3);
              }}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl ${
                selectedTime
                  ? "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/25 shimmer-gold"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              <span>Continuar con la hora ({selectedTime || "--:--"})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-zinc-950/85 backdrop-blur-md border-t border-zinc-800/80 z-40 flex justify-center">
          <div className="w-full max-w-lg">
            <button
              disabled={!clientName.trim() || !clientPhone.trim() || isSubmitting}
              onClick={handleConfirmBooking}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl ${
                clientName.trim() && clientPhone.trim() && !isSubmitting
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 shimmer-gold"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>{isSubmitting ? "Bloqueando cita..." : "Confirmar y enviar por WhatsApp"}</span>
            </button>
          </div>
        </div>
      )}

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
              Indica tu nombre y te abrimos WhatsApp preparado para que el barbero te avise si se libera algún hueco.
            </p>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Tu nombre:</label>
              <input
                type="text"
                required
                placeholder="Ej: Marcos García"
                value={waitlistName}
                onChange={(e) => setWaitlistName(e.target.value)}
                className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWaitlistModal(false)}
                className="w-1/2 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 rounded-xl text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 rounded-xl text-xs font-bold transition shadow-md"
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