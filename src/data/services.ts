export interface Service {
  id: string;
  name: string;
  duration: number; // minutos
  price: number;    // euros
  popular?: boolean;
}

export const BARBER_INFO = {
  name: "Jbarbers",
  tagline: "Barbería clásica & moderna",
  phone: "34671237755", // Sustituye este número por el WhatsApp real de tu amigo con el prefijo 34
  schedule: {
    startHour: 16,
    endHour: 19,
    endMinute: 30,
    slotMinutes: 30,
  },
  workingDays: [1, 2, 3, 4, 5], // Lunes a Viernes
};

export const SERVICES: Service[] = [
  { id: "1", name: "Degradado", duration: 30, price: 8, popular: true },
  { id: "2", name: "Degradado con rasuradora", duration: 30, price: 9 },
  { id: "3", name: "Degradado + barba", duration: 30, price: 12, popular: true },
  { id: "4", name: "Degradado + perfilar barba", duration: 30, price: 10 },
  { id: "5", name: "Barba", duration: 10, price: 4 },
  { id: "6", name: "Cejas", duration: 5, price: 2 },
  { id: "7", name: "Corte Clásico", duration: 30, price: 8 },
  { id: "8", name: "Corte niño 0-2 años", duration: 30, price: 6 },
  { id: "9", name: "Rapado", duration: 30, price: 6 },
];