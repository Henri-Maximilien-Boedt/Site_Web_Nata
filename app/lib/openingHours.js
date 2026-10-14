// Source unique de vérité pour les horaires.
//
// Toute modification d'horaire se fait ICI, jamais dans les vues ni dans
// public/js/app.js : le front reçoit ces valeurs via clientState.openingHours,
// et les vues via app.locals.openingHours.

// Durée qu'occupe une réservation, en minutes. Le code utilisait auparavant
// 120 côté serveur et 90 côté admin, avec « 1h30 » dans les emails.
const RESERVATION_DURATION_MIN = 120

// Pas entre deux créneaux proposés, en minutes.
const SLOT_STEP_MIN = 30

// Services de la cuisine. Ce sont eux, et eux seuls, qui génèrent des créneaux.
const SERVICES = {
  lunch: { key: 'lunch', label: 'Midi', start: '12:00', end: '14:00' },
  evening: { key: 'evening', label: 'Soir', start: '18:00', end: '22:00' }
}

const SERVICE_ORDER = ['lunch', 'evening']

// Services ouverts par jour de la semaine (0 = dimanche … 6 = samedi).
// Le dimanche, seul le service du soir est réservable.
const SERVICES_BY_WEEKDAY = {
  0: ['evening'],
  1: ['lunch', 'evening'],
  2: ['lunch', 'evening'],
  3: ['lunch', 'evening'],
  4: ['lunch', 'evening'],
  5: ['lunch', 'evening'],
  6: ['lunch', 'evening']
}

// Jours de fermeture complète : ceux qui n'ont aucun service.
const CLOSED_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6].filter(
  (weekday) => !(SERVICES_BY_WEEKDAY[weekday] || []).length
)

// Horaires du bar : affichage seul, aucun créneau de réservation.
const BAR_HOURS = { start: '12:00', end: '01:00' }
const BAR_HOURS_SUNDAY = { start: '15:00', end: '01:00' }

const toMinutes = (value) => {
  const [hours, minutes] = String(value || '')
    .split(':')
    .map((part) => Number.parseInt(part, 10))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0
  return hours * 60 + minutes
}

const fromMinutes = (total) => {
  const safe = Math.max(0, Math.round(total))
  const hours = Math.floor(safe / 60) % 24
  const minutes = safe % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const isClosedWeekday = (weekday) => CLOSED_WEEKDAYS.includes(Number(weekday))

// Services ouverts un jour donné. `lunchDisabled` est le coupe-circuit admin
// qui ferme le midi sans toucher au soir.
const getServicesForWeekday = (weekday, { lunchDisabled = false } = {}) => {
  if (isClosedWeekday(weekday)) return []
  const open = SERVICES_BY_WEEKDAY[Number(weekday)] || []
  return SERVICE_ORDER.filter(
    (key) => open.includes(key) && !(key === 'lunch' && lunchDisabled)
  )
}

// Heures de début réservables pour un service, bornes incluses.
const getSlotsForService = (serviceKey) => {
  const service = SERVICES[serviceKey]
  if (!service) return []

  const slots = []
  const end = toMinutes(service.end)
  for (let value = toMinutes(service.start); value <= end; value += SLOT_STEP_MIN) {
    slots.push(fromMinutes(value))
  }
  return slots
}

const getSlotsForWeekday = (weekday, options = {}) =>
  getServicesForWeekday(weekday, options).flatMap((key) => getSlotsForService(key))

// Service auquel appartient une heure donnée.
const getServiceForTime = (time) => {
  const minutes = toMinutes(time)
  const lunchEnd = toMinutes(SERVICES.lunch.end)
  return minutes <= lunchEnd ? 'lunch' : 'evening'
}

// Libellé de durée affiché aux clients (emails, écrans).
const getDurationLabel = () => {
  const hours = Math.floor(RESERVATION_DURATION_MIN / 60)
  const minutes = RESERVATION_DURATION_MIN % 60
  return minutes ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`
}

const formatRange = (start, end) => `${start} – ${end}`

// Lignes d'horaires prêtes à afficher dans les vues.
const getDisplayHours = () => ({
  kitchen: [
    {
      days: 'Lundi – Samedi',
      value: `${formatRange(SERVICES.lunch.start, SERVICES.lunch.end)} · ${formatRange(SERVICES.evening.start, SERVICES.evening.end)}`
    },
    { days: 'Dimanche', value: formatRange(SERVICES.evening.start, SERVICES.evening.end) }
  ],
  bar: [
    { days: 'Lundi – Samedi', value: formatRange(BAR_HOURS.start, BAR_HOURS.end) },
    { days: 'Dimanche', value: formatRange(BAR_HOURS_SUNDAY.start, BAR_HOURS_SUNDAY.end) }
  ]
})

// Spécification schema.org pour les données structurées de l'accueil.
const getStructuredDataHours = () => [
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: BAR_HOURS.start,
    closes: BAR_HOURS.end
  },
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Sunday'],
    opens: BAR_HOURS_SUNDAY.start,
    closes: BAR_HOURS_SUNDAY.end
  }
]

// Charge utile envoyée au navigateur dans clientState.
const getClientPayload = () => ({
  durationMinutes: RESERVATION_DURATION_MIN,
  durationLabel: getDurationLabel(),
  slotStepMinutes: SLOT_STEP_MIN,
  closedWeekdays: [...CLOSED_WEEKDAYS],
  services: SERVICE_ORDER.map((key) => ({
    key,
    label: SERVICES[key].label,
    start: SERVICES[key].start,
    end: SERVICES[key].end,
    slots: getSlotsForService(key)
  })),
  // Planning brut : le client applique lui-même lunchDisabled, lu à chaud.
  servicesByWeekday: [0, 1, 2, 3, 4, 5, 6].map((weekday) => getServicesForWeekday(weekday))
})

module.exports = {
  BAR_HOURS,
  BAR_HOURS_SUNDAY,
  CLOSED_WEEKDAYS,
  RESERVATION_DURATION_MIN,
  SERVICES,
  SERVICE_ORDER,
  SERVICES_BY_WEEKDAY,
  SLOT_STEP_MIN,
  getClientPayload,
  getDisplayHours,
  getDurationLabel,
  getServiceForTime,
  getServicesForWeekday,
  getSlotsForService,
  getSlotsForWeekday,
  getStructuredDataHours,
  isClosedWeekday
}
