export interface Service {
  id: string;
  name: string;
  duration: number; // minutos
  price: number;    // euros
  description?: string;
  popular?: boolean;
}

export const BARBER_INFO = {
  name: "JBarbers",
  phone: "34671237755",
  instagram: "j.barber.s",
  instagramUrl: "https://instagram.com/j.barber.s",
  address: "14 C. Hernán Cortés, Piornal, Extremadura",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=14+C.+Hern%C3%A1n+Cort%C3%A9s,+Piornal,+Extremadura",
  // Franjas de 30 minutos de mañana y tarde
  morningSlots: [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30"
  ],
  afternoonSlots: [
    "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"
  ]
};

export const SERVICES: Service[] = [
  { id: "1", name: "Degradado", duration: 30, price: 8, popular: true, description: "Fade pulido a máquina y tijera" },
  { id: "2", name: "Degradado con rasuradora", duration: 30, price: 9, description: "Corte al cero máximo con máquina afeitadora" },
  { id: "3", name: "Degradado + barba", duration: 45, price: 12, popular: true, description: "Corte degradado completo con perfilado de barba" },
  { id: "4", name: "Degradado + perfilar barba", duration: 30, price: 10, description: "Degradado con retoque rápido de líneas de barba" },
  { id: "5", name: "Barba", duration: 15, price: 4, description: "Arreglo y perfilado tradicional de barba" },
  { id: "6", name: "Cejas", duration: 10, price: 2, description: "Perfilado y limpieza con navaja" },
  { id: "7", name: "Corte Clásico", duration: 30, price: 8, description: "Corte a tijera o máquina uniforme" },
  { id: "8", name: "Corte niño 0-2 años", duration: 30, price: 6, description: "Corte adaptado para los más pequeños" },
  { id: "9", name: "Rapado", duration: 20, price: 6, description: "Corte rasurado completo uniforme" },
];