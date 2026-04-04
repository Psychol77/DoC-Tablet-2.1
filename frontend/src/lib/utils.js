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
export const EQUIPMENT_LIST = [
  { id: 'combat_pistol', name: 'Combat Pistol', category: 'Broń', hasSerial: true },
  { id: 'taser', name: 'Taser', category: 'Broń', hasSerial: true },
  { id: 'bbg', name: 'BBG', category: 'Broń', hasSerial: true },
  { id: 'smg', name: 'SMG', category: 'Broń', hasSerial: true },
  { id: 'radio', name: 'Radio', category: 'Elektronika', hasSerial: true },
  { id: 'bodycam', name: 'BodyCam', category: 'Elektronika', hasSerial: true },
  { id: 'gps', name: 'GPS', category: 'Elektronika', hasSerial: true },
  { id: 'ammo_9mm', name: 'Amunicja 9mm', category: 'Amunicja', hasSerial: false },
  { id: 'ammo_bbg', name: 'Amunicja BBG', category: 'Amunicja', hasSerial: false },
  { id: 'ammo_smg', name: 'Amunicja SMG', category: 'Amunicja', hasSerial: false },
  { id: 'handcuffs', name: 'Kajdanki', category: 'Wyposażenie', hasSerial: false },
  { id: 'flashbang', name: 'FlashBang', category: 'Wyposażenie', hasSerial: false },
  { id: 'gas', name: 'Gaz służbowy', category: 'Wyposażenie', hasSerial: false },
  { id: 'baton', name: 'Pałka policyjna', category: 'Wyposażenie', hasSerial: false },
  { id: 'flashlight', name: 'Latarka', category: 'Wyposażenie', hasSerial: false },
  { id: 'vest', name: 'Kamizelka policyjna', category: 'Odzież', hasSerial: false },
  { id: 'vest_plates', name: 'Wkłady do kamizelki', category: 'Odzież', hasSerial: false },
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
