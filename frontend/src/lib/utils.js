import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// KONFIGURACJA RANG - zgodna z hierarchią
export const RANKS_CONFIG = {
  // Board - mogą edytować wszystkich
  "Warden": { group: "BOARD", level: 10, color: 'text-yellow-500' },
  "D. Warden": { group: "BOARD", level: 9, color: 'text-yellow-500' },
  "AoW": { group: "BOARD", level: 8, color: 'text-yellow-500' },
  // Command - mogą edytować wszystkich
  "Captain": { group: "COMMAND", level: 7, color: 'text-blue-400' },
  "Lieutenant": { group: "COMMAND", level: 6, color: 'text-blue-400' },
  // Officers - read-only własny profil
  "Sergeant": { group: "OFFICERS", level: 5, color: 'text-green-400' },
  "PO III": { group: "OFFICERS", level: 4, color: 'text-zinc-400' },
  "PO II": { group: "OFFICERS", level: 3, color: 'text-zinc-400' },
  "PO I": { group: "OFFICERS", level: 2, color: 'text-zinc-400' },
  "Kadet": { group: "OFFICERS", level: 1, color: 'text-zinc-500' },
};

// Grupy hierarchiczne
export const HIERARCHY_GROUPS = {
  'BOARD': ['Warden', 'D. Warden', 'AoW'],
  'HIGH COMMAND': ['Captain'],
  'COMMAND': ['Lieutenant'],
  'SERGEANT': ['Sergeant'],
  'OFFICERS': ['PO III', 'PO II', 'PO I', 'Kadet']
};

// Lista pozycji
export const POSITIONS = [
  'Warden', 'D. Warden', 'AoW',
  'Captain', 'Lieutenant',
  'Sergeant',
  'PO III', 'PO II', 'PO I', 'Kadet'
];

// Paski zasługi - 6 checkboxów
export const MERIT_BARS = [
  "Wzorowa służba",
  "Odwaga",
  "Instruktor",
  "Negocjator",
  "Strzelec wyborowy",
  "Długoletnia służba"
];

// Lista wyposażenia z konfiguracją S/N
// hasSerial: true = wymaga numeru seryjnego (broń)
// hasSerial: false = wymaga podania ilości
export const EQUIPMENT_LIST = [
  // Broń - numer seryjny wymagany
  { id: 'combat_pistol', name: 'Combat Pistol', category: 'Broń', hasSerial: true },
  { id: 'tazer', name: 'Tazer', category: 'Broń', hasSerial: true },
  { id: 'bbg', name: 'BBG', category: 'Broń', hasSerial: true },
  { id: 'smg', name: 'SMG', category: 'Broń', hasSerial: true },
  // Wyposażenie - ilość
  { id: 'ammo_9mm', name: 'Ammo-9mm', category: 'Amunicja', hasSerial: false },
  { id: 'rubber_bullets', name: 'Gumowe kule', category: 'Amunicja', hasSerial: false },
  { id: 'bodycam', name: 'BodyCam', category: 'Elektronika', hasSerial: false },
  { id: 'flashlight', name: 'Latarka', category: 'Wyposażenie', hasSerial: false },
  { id: 'gas', name: 'Gaz', category: 'Wyposażenie', hasSerial: false },
  { id: 'radio', name: 'Radio', category: 'Elektronika', hasSerial: false },
  { id: 'baton', name: 'Pałka policyjna', category: 'Wyposażenie', hasSerial: false },
  { id: 'vest_plate_1', name: 'Wkład do kamizelki 1.0', category: 'Odzież', hasSerial: false },
  { id: 'vest_plate_2', name: 'Wkład do kamizelki 2.0', category: 'Odzież', hasSerial: false },
  { id: 'vest_plate_3', name: 'Wkład do kamizelki 3.0', category: 'Odzież', hasSerial: false },
  { id: 'vest', name: 'Kamizelka policyjna', category: 'Odzież', hasSerial: false },
  { id: 'handcuffs', name: 'Kajdanki', category: 'Wyposażenie', hasSerial: false },
];

// Kategorie sprzętu
export const CATEGORIES = ['Broń', 'Wyposażenie', 'Elektronika', 'Amunicja', 'Odzież', 'Inne'];

// Statusy sprzętu
export const STATUSES = ['Dostępny', 'W użyciu', 'W naprawie', 'Zutylizowany'];

// Szkolenia
export const TRAININGS = [
  { key: 'OPP', label: 'OPP' },
  { key: 'KPP', label: 'KPP' },
  { key: 'Strzelanie', label: 'Strzelanie' },
  { key: 'Taktyka', label: 'Taktyka' },
  { key: 'Prawo', label: 'Prawo' },
  { key: 'PierwszaPomoc', label: 'Pierwsza Pomoc' },
];

// Walidacja numeru odznaki (1-999)
export const validateBadgeNumber = (badge) => {
  const num = parseInt(badge);
  return !isNaN(num) && num >= 1 && num <= 999;
};

// Sprawdź czy ranga ma uprawnienia do edycji
export const canEditProfiles = (position, role) => {
  if (role === 'founder') return true;
  const config = RANKS_CONFIG[position];
  return config && (config.group === 'BOARD' || config.group === 'COMMAND' || config.group === 'HIGH COMMAND');
};

// Sprawdź czy to ranga Officers (read-only)
export const isOfficerRank = (position) => {
  const config = RANKS_CONFIG[position];
  return config && (config.group === 'OFFICERS' || config.group === 'SERGEANT');
};
