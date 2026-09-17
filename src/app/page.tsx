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
  ShieldCheck,
  Code2,
  Ticket,
  X
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

const playMechanicalClick = () => {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {}
};

const triggerHaptic = (duration = 45) => {
  playMechanicalClick();
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
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  
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

  // Despliegue de firma a 1 solo toque
  const [showCreatorBadge, setShowCreatorBadge] = useState<boolean>(false);

  const allSlots = [...BARBER_INFO.morningSlots, ...BARBER_INFO.afternoonSlots];

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

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

  // Al pulsar una vez sobre tu nombre, se despliega la tarjeta
  const handleSignatureClick = () => {
    triggerHaptic(35);
    setShowCreatorBadge((prev) => !prev);
  };

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center selection:bg-amber-500 selection:text-black pb-36 relative overflow-x-hidden">
      
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
        @keyframes rotateBorder {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .neon-border-box {
          position: relative;
          z-index: 0;
          overflow: hidden;
        }
        .neon-border-box::before {
          content: '';
          position: absolute;
          z-index: -2;
          left: -50%;
          top: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(transparent, #f59e0b, transparent 30%);
          animation: rotateBorder 4s linear infinite;
        }
        .neon-border-box::after {
          content: '';
          position: absolute;
          z-index: -1;
          left: 1px;
          top: 1px;
          width: calc(100% - 2px);
          height: calc(100% - 2px);
          background: #18181b;
          border-radius: inherit;
        }
        @keyframes floatDust {
          0% { transform: translateY(0px) translateX(0px); opacity: 0.2; }
          50% { transform: translateY(-35px) translateX(15px); opacity: 0.7; }
          100% { transform: translateY(-70px) translateX(-10px); opacity: 0; }
        }
        .gold-dust {
          position: fixed;
          width: 3px;
          height: 3px;
          background: #fbbf24;
          border-radius: 50%;
          box-shadow: 0 0 8px #f59e0b;
          pointer-events: none;
          z-index: 1;
        }
      ` }} />

      <div className="gold-dust" style={{ top: "25%", left: "15%", animation: "floatDust 6s infinite ease-in-out" }} />
      <div className="gold-dust" style={{ top: "45%", left: "80%", animation: "floatDust 8s 1.5s infinite ease-in-out" }} />
      <div className="gold-dust" style={{ top: "70%", left: "30%", animation: "floatDust 7s 3s infinite ease-in-out" }} />

      {/* BARBER POLE */}
      <div className="w-full max-w-lg h-1.5 barber-pole-stripe opacity-90 shadow-sm" />

      {/* CINTA MARQUEE */}
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

        {/* LIVE BADGE + WIDGET PIORNAL */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
          {nextAvailableToday ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/85 backdrop-blur-md border border-amber-500/50 text-amber-400 text-[11px] font-semibold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>⚡ Hueco libre hoy: {nextAvailableToday} h</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/85 backdrop-blur-md border border-zinc-700 text-zinc-300 text-[11px] font-semibold shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{greeting}</span>
            </div>
          )}

          <div className="px-2.5 py-1 rounded-full bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-[11px] text-zinc-300 font-mono flex items-center gap-1 shadow-md">
            <span className="text-zinc-500">Piornal</span>
            <span className="text-amber-400 font-bold">{currentTimeStr}</span>
          </div>
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

          {/* FILA DE ENLACES + LOS 2 LOGOS SUELTOS ESTILO PINES METÁLICOS */}
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <a
              href={BARBER_INFO.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => triggerHaptic(30)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/90 hover:bg-zinc-750 active:scale-95 text-zinc-300 text-[11px] border border-zinc-700 transition-all shadow-md"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Piornal</span>
            </a>

            <a
              href={BARBER_INFO.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => triggerHaptic(30)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/90 hover:bg-zinc-750 active:scale-95 text-zinc-300 text-[11px] border border-zinc-700 transition-all shadow-md"
            >
              <InstagramIcon className="w-3.5 h-3.5 text-rose-400" />
              <span>@{BARBER_INFO.instagram}</span>
            </a>

            {/* LOGO 1: C.F. PIORNAL SUELTO */}
            <div 
              className="relative w-7 h-7 rounded-full bg-zinc-900 border border-zinc-700/80 p-0.5 shadow-md flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
              title="C.F. Piornal"
              onClick={() => triggerHaptic(20)}
            >
              <Image
                src="/cf-piornal.png"
                alt="C.F. Piornal"
                width={20}
                height={20}
                className="object-contain"
              />
            </div>

            {/* LOGO 2: JARRAMPLAS SUELTO */}
            <div 
              className="relative w-7 h-7 rounded-full bg-zinc-900 border border-zinc-700/80 overflow-hidden shadow-md flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
              title="Jarramplas Piornal"
              onClick={() => triggerHaptic(20)}
            >
              <Image
                src="/jarramplas.jpg"
                alt="Jarramplas"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* DYNAMIC ISLAND DE PROGRESO */}
        {step < 4 && (
          <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/70 flex justify-center">
            <div className="w-full max-w-xs bg-zinc-900/90 border border-zinc-700/60 rounded-full px-4 py-1.5 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[11px] font-bold text-zinc-200">
                  {step === 1 && "Paso 1 de 3 • Seleccionar corte"}
                  {step === 2 && "Paso 2 de 3 • Elegir día y hora"}
                  {step === 3 && "Paso 3 de 3 • Confirmar cita"}
                </span>
              </div>
              <span className="text-[10px] font-black text-amber-400">
                {step === 1 ? "33%" : step === 2 ? "66%" : "100%"}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="w-full max-w-lg p-5 flex-1 flex flex-col justify-between">
        
        {/* PASO 1: SELECCIONAR SERVICIO */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black tracking-wider uppercase text-zinc-300 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-400" /> Catálogo de servicios
              </h2>
              <span className="text-[11px] text-zinc-500 font-semibold">{SERVICES.length} opciones</span>
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
                  className={`text-left p-4 rounded-2xl border transition-all flex items-center justify-between relative overflow-hidden group shadow-lg active:scale-[0.98] ${
                    s.popular
                      ? "neon-border-box"
                      : "bg-zinc-900/90 hover:bg-zinc-850 hover:border-amber-500/40 border-zinc-800/90 text-zinc-200"
                  }`}
                >
                  {s.popular && (
                    <span className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-xl flex items-center gap-0.5 shadow-md z-10">
                      <Sparkles className="w-2.5 h-2.5" /> Más pedido
                    </span>
                  )}
                  <div className="relative z-10">
                    <h3 className="font-bold text-sm text-zinc-100 group-hover:text-amber-400 transition-colors">
                      {s.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{s.description}</p>
                    <span className="text-[11px] text-zinc-500 mt-1 inline-block">
                      ⏱️ {s.duration} min
                    </span>
                  </div>
                  <div className="text-right pl-3 flex items-center gap-2 relative z-10">
                    <span className="text-base font-black text-amber-400">{s.price} €</span>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2: HORARIOS */}
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
                <div className="p-3 rounded-2xl bg-amber-500/[0.03] border border-amber-500/20 space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" /> Turnos de Mañana
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
                              ? "bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
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

                <div className="p-3 rounded-2xl bg-indigo-500/[0.03] border border-indigo-500/20 space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400/90 flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" /> Turnos de Tarde
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
                              ? "bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
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

        {/* PASO 3: TICKET VIP Y FORMULARIO */}
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

            {/* TICKET VIP DIGITAL PERFORADO */}
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl overflow-hidden">
              <div className="absolute top-1/2 -left-3 w-6 h-6 bg-zinc-950 rounded-full border-r border-zinc-800 -translate-y-1/2" />
              <div className="absolute top-1/2 -right-3 w-6 h-6 bg-zinc-950 rounded-full border-l border-zinc-800 -translate-y-1/2" />

              <div className="flex items-center justify-between pb-3 border-b border-dashed border-zinc-700/80">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <Ticket className="w-4 h-4" />
                  <span>Pase Oficial de Reserva</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">JB-{selectedTime.replace(":", "")}</span>
              </div>

              <div className="py-3 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Servicio:</span>
                  <span className="font-bold text-zinc-100">{selectedService.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Fecha y Hora:</span>
                  <span className="font-black text-amber-400">{selectedDate} • {selectedTime} h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Precio estimado:</span>
                  <span className="text-base font-black text-emerald-400">{selectedService.price} €</span>
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-zinc-700/80 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-mono tracking-widest">||| | ||| || ||| | || |||</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  VERIFICADO
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
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

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Tu turno se bloqueará en tiempo real para evitar solapamientos.</span>
            </div>
          </div>
        )}

        {/* PASO 4: CONFIRMACIÓN */}
        {step === 4 && selectedService && (
          <div className="text-center py-6 space-y-5">
            <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-zinc-100 uppercase tracking-wide">
                ¡Cita Confirmada!
              </h2>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                Hemos enviado todos los datos por WhatsApp al barbero. Guarda este pase en tu móvil:
              </p>
            </div>

            <div className="relative max-w-xs mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl overflow-hidden text-left">
              <div className="absolute top-1/2 -left-3 w-6 h-6 bg-zinc-950 rounded-full border-r border-zinc-800 -translate-y-1/2" />
              <div className="absolute top-1/2 -right-3 w-6 h-6 bg-zinc-950 rounded-full border-l border-zinc-800 -translate-y-1/2" />

              <div className="flex items-center justify-between pb-3 border-b border-dashed border-zinc-700">
                <span className="text-xs font-black text-amber-400 uppercase">JBARBERS PIORNAL</span>
                <span className="text-[10px] font-mono text-zinc-400">{selectedDate}</span>
              </div>

              <div className="py-3 text-xs space-y-1.5">
                <p className="font-bold text-zinc-100 text-sm">{clientName}</p>
                <p className="text-zinc-400">{selectedService.name} • <strong className="text-emerald-400">{selectedService.price} €</strong></p>
                <p className="text-amber-400 font-extrabold text-sm flex items-center gap-1">
                  <span>⏰ Hora: {selectedTime} h</span>
                </p>
                <p className="text-[10px] text-zinc-500 pt-1">📍 C. Hernán Cortés 13, Piornal</p>
              </div>

              <div className="pt-2 border-t border-dashed border-zinc-700 flex justify-between items-center">
                <span className="text-[9px] font-mono text-zinc-500">|||| || | |||| |||</span>
                <span className="text-[9px] font-bold text-emerald-400 uppercase">RESERVA ACTIVA</span>
              </div>
            </div>

            <div className="pt-2">
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
                className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 active:scale-95 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-all shadow-md"
              >
                Pedir otra cita
              </button>
            </div>
          </div>
        )}
      </main>

      {/* PIE DE PÁGINA: TU HUELLA DE AUTOR (DESPLIEGUE A 1 SOLO TOQUE) */}
      <footer className="w-full max-w-lg mt-auto pt-6 pb-2 text-center select-none">
        <button
          onClick={handleSignatureClick}
          className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-amber-400 active:scale-95 transition"
        >
          <Code2 className="w-3.5 h-3.5 text-zinc-600" />
          <span>Designed & Built with precision by <strong className="font-bold text-zinc-300 hover:text-amber-400 underline decoration-amber-500/50 underline-offset-2">Borja</strong></span>
        </button>
      </footer>

      {/* TARJETA DE AUTOR DESPLEGABLE A 1 SOLO TOQUE */}
      {showCreatorBadge && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-zinc-900 border border-amber-500/40 rounded-3xl p-5 text-center space-y-4 shadow-[0_0_30px_rgba(245,158,11,0.3)] relative">
            <button
              onClick={() => setShowCreatorBadge(false)}
              className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 bg-amber-500/15 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-zinc-100">Desarrollo & Diseño Web</h3>
              <p className="text-xs text-amber-400 font-semibold mt-0.5">Creado a medida por Borja</p>
              <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                Plataforma exclusiva desarrollada para la digitalización de <strong>JBarbers Piornal</strong>.
              </p>
            </div>

            <button
              onClick={() => setShowCreatorBadge(false)}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold transition shadow-md shadow-amber-500/20"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* STICKY BAR */}
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

      {/* MODAL LISTA DE ESPERA */}
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