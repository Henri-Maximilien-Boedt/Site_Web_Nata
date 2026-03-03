/**
 * Horaires d'ouverture de NATA Bar.
 * Clé = jour de la semaine (0=Dimanche, 1=Lundi, ..., 6=Samedi).
 * Chaque plage a un start et un end (heure de fermeture cuisine,
 * la dernière réservation doit se terminer avant end).
 */
export const OPENING_HOURS = {
  0: [],                                                                       // Dimanche — fermé
  1: [{ start: "18:00", end: "22:00" }],                                      // Lundi — soir seulement
  2: [{ start: "12:00", end: "14:30" }, { start: "18:00", end: "22:00" }],   // Mardi
  3: [{ start: "12:00", end: "14:30" }, { start: "18:00", end: "22:00" }],   // Mercredi
  4: [{ start: "12:00", end: "14:30" }, { start: "18:00", end: "22:00" }],   // Jeudi
  5: [{ start: "12:00", end: "14:30" }, { start: "18:00", end: "22:00" }],   // Vendredi
  6: [{ start: "12:00", end: "14:30" }, { start: "18:00", end: "22:00" }],   // Samedi
};

/** Durée d'une réservation en minutes */
export const SLOT_DURATION = 120;

/** Intervalle entre créneaux en minutes */
const SLOT_INTERVAL = 30;

/**
 * Convertit une heure "HH:MM" en nombre de minutes depuis minuit.
 */
export function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Convertit des minutes depuis minuit en chaîne "HH:MM".
 */
export function minToTime(min) {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Vérifie si deux créneaux de 2h se chevauchent.
 * @param {string} startA - "HH:MM"
 * @param {string} startB - "HH:MM"
 * @param {number} durationMinutes - durée (défaut 120)
 */
export function timesOverlap(startA, startB, durationMinutes = SLOT_DURATION) {
  const endA = timeToMin(startA) + durationMinutes;
  const endB = timeToMin(startB) + durationMinutes;
  return timeToMin(startA) < endB && timeToMin(startB) < endA;
}

/**
 * Retourne les créneaux disponibles pour une date donnée (objet Date ou string ISO).
 * Un créneau est valide si le repas entier (2h) se termine avant la fermeture.
 * @returns {string[]} Liste de créneaux "HH:MM"
 */
export function getSlotsForDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const dayOfWeek = d.getDay(); // 0=dim ... 6=sam
  const periods = OPENING_HOURS[dayOfWeek] ?? [];

  const slots = [];

  for (const period of periods) {
    const periodStart = timeToMin(period.start);
    const periodEnd = timeToMin(period.end);

    // Le dernier créneau doit se terminer au plus tard à periodEnd
    let cursor = periodStart;
    while (cursor + SLOT_DURATION <= periodEnd) {
      slots.push(minToTime(cursor));
      cursor += SLOT_INTERVAL;
    }
  }

  return slots;
}

/**
 * Retourne true si le restaurant est ouvert le jour donné.
 */
export function isOpenDay(date) {
  const d = date instanceof Date ? date : new Date(date);
  return (OPENING_HOURS[d.getDay()] ?? []).length > 0;
}

/**
 * Formate une date en français : "lundi 3 mars 2026"
 */
export function formatDateFR(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
