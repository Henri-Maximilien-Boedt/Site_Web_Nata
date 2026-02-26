const menuBtn = document.querySelector('.menu-btn');
const nav = document.querySelector('.nav');
const year = document.getElementById('year');

const STORAGE_KEYS = {
  reservations: 'nata_reservations_v1',
  adminSession: 'nata_admin_session_v1',
};

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'Nata2026!',
};

const TABLES = [
  { id: 'T2-1', seats: 2, label: 'Table 2P - #1' },
  { id: 'T2-2', seats: 2, label: 'Table 2P - #2' },
  { id: 'T2-3', seats: 2, label: 'Table 2P - #3' },
  { id: 'T2-4', seats: 2, label: 'Table 2P - #4' },
  { id: 'T2-5', seats: 2, label: 'Table 2P - #5' },
  { id: 'T4-1', seats: 4, label: 'Table 4P - #1' },
  { id: 'T4-2', seats: 4, label: 'Table 4P - #2' },
  { id: 'T4-3', seats: 4, label: 'Table 4P - #3' },
  { id: 'T4-4', seats: 4, label: 'Table 4P - #4' },
  { id: 'T10-1', seats: 10, label: 'Grande table 10P' },
];

const TABLE_PLAN = {
  'T2-1': { x: 7, y: 12, w: 12, h: 11, shape: 'square' },
  'T2-2': { x: 7, y: 31, w: 12, h: 11, shape: 'square' },
  'T2-3': { x: 7, y: 50, w: 12, h: 11, shape: 'square' },
  'T2-4': { x: 8, y: 74, w: 11, h: 10, shape: 'square' },
  'T2-5': { x: 21, y: 74, w: 11, h: 10, shape: 'square' },
  'T4-1': { x: 24, y: 12, w: 22, h: 11, shape: 'rect' },
  'T4-2': { x: 54, y: 12, w: 22, h: 11, shape: 'rect' },
  'T4-3': { x: 24, y: 31, w: 14, h: 11, shape: 'square' },
  'T4-4': { x: 24, y: 50, w: 14, h: 11, shape: 'square' },
  'T10-1': { x: 82, y: 82, w: 13, h: 14, shape: 'round' },
};

const pad2 = (value) => String(value).padStart(2, '0');

const toISODate = (date) => {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  return `${yyyy}-${mm}-${dd}`;
};

const toMinutes = (value) => {
  const [hours, minutes] = String(value || '00:00').split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

const fromMinutes = (totalMinutes) => {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = pad2(Math.floor(normalized / 60));
  const minutes = pad2(normalized % 60);
  return `${hours}:${minutes}`;
};

const overlaps = (startA, endA, startB, endB) => startA < endB && startB < endA;

const fromISODate = (value) => {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const formatISODateLong = (iso) => {
  const date = fromISODate(iso);
  if (!date) return iso;
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const roundCurrentTimeToHalfHour = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes() < 30 ? 0 : 30;
  return `${pad2(hours)}:${pad2(minutes)}`;
};

const shiftISODate = (iso, deltaDays) => {
  const base = fromISODate(iso);
  if (!base) return toISODate(new Date());
  base.setDate(base.getDate() + deltaDays);
  return toISODate(base);
};

const escapeHTML = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

if (year) {
  year.textContent = new Date().getFullYear();
}

if (menuBtn && nav) {
  menuBtn.addEventListener('click', () => {
    nav.classList.toggle('open');
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => nav.classList.remove('open'));
  });
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const readReservations = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.reservations);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeReservations = (reservations) => {
  localStorage.setItem(STORAGE_KEYS.reservations, JSON.stringify(reservations));
};

const addReservation = (payload) => {
  const reservations = readReservations();
  reservations.unshift(payload);
  writeReservations(reservations);
};

const removeReservation = (id) => {
  const reservations = readReservations().filter((item) => item.id !== id);
  writeReservations(reservations);
};

const getTableById = (id) => TABLES.find((table) => table.id === id);

const isTableBooked = (tableId, dateISO, timeHHMM, ignoreReservationId = '') => {
  const targetStart = toMinutes(timeHHMM);
  const targetEnd = targetStart + 120;

  return readReservations().some((reservation) => {
    if (ignoreReservationId && reservation.id === ignoreReservationId) return false;
    if (reservation.date !== dateISO) return false;
    if (reservation.tableId !== tableId) return false;
    const start = toMinutes(reservation.time);
    const end = start + 120;
    return overlaps(targetStart, targetEnd, start, end);
  });
};

const bookingForms = Array.from(document.querySelectorAll('.booking-form'))
  .map((form) => ({
    form,
    dateHidden: form.querySelector('[data-date-value]'),
    dateTrigger: form.querySelector('[data-date-trigger]'),
    timeHidden: form.querySelector('[data-time-value]'),
    timeTrigger: form.querySelector('[data-time-trigger]'),
    tableHidden: form.querySelector('[data-table-value]'),
    tableTrigger: form.querySelector('[data-table-trigger]'),
    peopleInput: form.querySelector('input[name="people"]'),
  }))
  .filter(
    (entry) =>
      entry.dateHidden &&
      entry.dateTrigger &&
      entry.timeHidden &&
      entry.timeTrigger &&
      entry.tableHidden &&
      entry.tableTrigger &&
      entry.peopleInput
  );

if (bookingForms.length) {
  const fullLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const getSlotsForDate = (date) => {
    if (!date) return [];
    const day = date.getDay();
    if (day === 0) return [];
    const periods =
      day === 1
        ? [[18, 0, 22, 0]]
        : [
            [12, 0, 14, 30],
            [18, 0, 22, 0],
          ];

    const slots = [];
    periods.forEach(([sh, sm, eh, em]) => {
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      for (let value = start; value <= end; value += 30) {
        slots.push(fromMinutes(value));
      }
    });

    return slots;
  };

  const dateModal = document.createElement('div');
  dateModal.className = 'date-modal';
  dateModal.hidden = true;
  dateModal.innerHTML = `
    <div class="date-modal__backdrop" data-date-close></div>
    <div class="date-modal__panel" role="dialog" aria-modal="true" aria-labelledby="date-modal-title">
      <div class="date-modal__top">
        <h3 id="date-modal-title" class="date-modal__title">Choisis une date de réservation</h3>
        <button type="button" class="date-close" data-date-close>Fermer</button>
      </div>
      <div class="date-nav">
        <button type="button" data-date-prev>← Mois précédent</button>
        <p class="date-month" data-date-month></p>
        <button type="button" data-date-next>Mois suivant →</button>
      </div>
      <div class="date-weekdays">
        <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
      </div>
      <div class="date-grid" data-date-grid></div>
      <div class="date-quick">
        <button type="button" data-date-quick="today">Aujourd'hui</button>
        <button type="button" data-date-quick="tomorrow">Demain</button>
        <button type="button" data-date-quick="weekend">Ce week-end</button>
      </div>
    </div>
  `;
  document.body.appendChild(dateModal);

  const timeModal = document.createElement('div');
  timeModal.className = 'time-modal';
  timeModal.hidden = true;
  timeModal.innerHTML = `
    <div class="time-modal__backdrop" data-time-close></div>
    <div class="time-modal__panel" role="dialog" aria-modal="true" aria-labelledby="time-modal-title">
      <div class="time-modal__top">
        <h3 id="time-modal-title" class="time-modal__title">Choisis une heure</h3>
        <button type="button" class="date-close" data-time-close>Fermer</button>
      </div>
      <p class="time-date" data-time-date></p>
      <div class="time-grid" data-time-grid></div>
      <p class="time-empty" data-time-empty hidden>
        Aucun créneau ce jour. Fermé le dimanche.
      </p>
    </div>
  `;
  document.body.appendChild(timeModal);

  const tableModal = document.createElement('div');
  tableModal.className = 'table-modal';
  tableModal.hidden = true;
  tableModal.innerHTML = `
    <div class="table-modal__backdrop" data-table-close></div>
    <div class="table-modal__panel" role="dialog" aria-modal="true" aria-labelledby="table-modal-title">
      <div class="table-modal__top">
        <h3 id="table-modal-title" class="table-modal__title">Choisis ta table</h3>
        <button type="button" class="date-close" data-table-close>Fermer</button>
      </div>
      <p class="table-info" data-table-info></p>
      <div class="table-legend">
        <span><i class="legend-dot is-free"></i> Disponible</span>
        <span><i class="legend-dot is-busy"></i> Réservée</span>
        <span><i class="legend-dot is-small"></i> Inadaptée à la taille du groupe</span>
      </div>
      <div class="table-layout" data-table-layout></div>
    </div>
  `;
  document.body.appendChild(tableModal);

  const grid = dateModal.querySelector('[data-date-grid]');
  const monthTitle = dateModal.querySelector('[data-date-month]');
  const dateCloseButtons = dateModal.querySelectorAll('[data-date-close]');
  const prevBtn = dateModal.querySelector('[data-date-prev]');
  const nextBtn = dateModal.querySelector('[data-date-next]');
  const quickButtons = dateModal.querySelectorAll('[data-date-quick]');
  const timeGrid = timeModal.querySelector('[data-time-grid]');
  const timeDateText = timeModal.querySelector('[data-time-date]');
  const timeEmpty = timeModal.querySelector('[data-time-empty]');
  const timeCloseButtons = timeModal.querySelectorAll('[data-time-close]');
  const tableInfo = tableModal.querySelector('[data-table-info]');
  const tableLayout = tableModal.querySelector('[data-table-layout]');
  const tableCloseButtons = tableModal.querySelectorAll('[data-table-close]');

  let activeBooking = null;
  let visibleMonth = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  let selectedISO = '';
  let selectedTime = '';

  const showFeedback = (booking, message, type = 'ok') => {
    let feedback = booking.form.querySelector('[data-booking-feedback]');
    if (!feedback) {
      feedback = document.createElement('p');
      feedback.className = 'booking-feedback';
      feedback.setAttribute('data-booking-feedback', '');
      feedback.setAttribute('aria-live', 'polite');
      booking.form.appendChild(feedback);
    }
    feedback.textContent = message;
    feedback.classList.remove('is-error');
    if (type === 'error') feedback.classList.add('is-error');
  };

  const getPeopleCount = (booking) => {
    const value = Number.parseInt(booking.peopleInput.value, 10);
    return Number.isNaN(value) ? 0 : value;
  };

  const resetTable = (booking) => {
    booking.tableHidden.value = '';
    booking.tableTrigger.value = '';
    booking.tableTrigger.classList.remove('is-filled');
    booking.tableTrigger.placeholder = 'Choisis d\'abord une date et une heure';
  };

  const resetDateAndTime = (booking) => {
    booking.dateHidden.value = '';
    booking.timeHidden.value = '';
    booking.dateTrigger.value = '';
    booking.timeTrigger.value = '';
    booking.dateTrigger.classList.remove('is-filled');
    booking.timeTrigger.classList.remove('is-filled');
    booking.dateTrigger.placeholder = 'Cliquez pour choisir une date';
    booking.timeTrigger.placeholder = 'Sélectionnez d\'abord une date';
    resetTable(booking);
  };

  const openDateModal = (booking) => {
    activeBooking = booking;
    selectedISO = booking.dateHidden.value || '';
    const selectedDate = fromISODate(selectedISO);
    visibleMonth = new Date(
      (selectedDate || todayStart).getFullYear(),
      (selectedDate || todayStart).getMonth(),
      1
    );
    dateModal.hidden = false;
    renderCalendar();
  };

  const closeDateModal = () => {
    dateModal.hidden = true;
    activeBooking = null;
  };

  const openTimeModal = (booking) => {
    const date = fromISODate(booking.dateHidden.value);
    if (!date) return;
    activeBooking = booking;
    selectedTime = booking.timeHidden.value || '';
    timeDateText.textContent = `Date choisie: ${fullLabel.format(date)}`;
    renderTimeSlots(date);
    timeModal.hidden = false;
  };

  const closeTimeModal = () => {
    timeModal.hidden = true;
    activeBooking = null;
  };

  const openTableModal = (booking) => {
    if (!booking.dateHidden.value || !booking.timeHidden.value) return;
    const people = getPeopleCount(booking);
    if (!people || people < 1) {
      showFeedback(booking, 'Indique d\'abord le nombre de personnes.', 'error');
      return;
    }

    activeBooking = booking;
    renderTablePlan(booking);
    tableModal.hidden = false;
  };

  const closeTableModal = () => {
    tableModal.hidden = true;
    activeBooking = null;
  };

  const resetTime = (booking) => {
    booking.timeHidden.value = '';
    booking.timeTrigger.value = '';
    booking.timeTrigger.classList.remove('is-filled');
    booking.timeTrigger.placeholder = 'Choisis une heure disponible';
    resetTable(booking);
  };

  const renderTablePlan = (booking) => {
    const date = booking.dateHidden.value;
    const time = booking.timeHidden.value;
    const people = getPeopleCount(booking);
    tableInfo.textContent = `Créneau: ${formatISODateLong(date)} à ${time} (2h) - ${people} personne${people > 1 ? 's' : ''}`;

    const decorations = `
      <div class="table-floor__bar">BAR</div>
      <div class="table-floor__pillar table-floor__pillar--one"></div>
      <div class="table-floor__pillar table-floor__pillar--two"></div>
      <div class="table-floor__stair" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
    `;

    tableLayout.innerHTML = `${decorations}${TABLES.map((table) => {
      const occupied = isTableBooked(table.id, date, time);
      const tooSmall = !occupied && people > table.seats;
      const selected = booking.tableHidden.value === table.id;
      const disabled = occupied || tooSmall;
      const plan = TABLE_PLAN[table.id] || { x: 10, y: 10, w: 12, h: 10, shape: 'square' };
      const chairCount = Math.max(2, Math.min(6, table.seats));
      const status = occupied ? 'Réservée' : tooSmall ? 'Trop petite' : 'Libre';

      return `
        <button
          type="button"
          class="table-seat table-seat--${plan.shape}${occupied ? ' is-busy' : ''}${tooSmall ? ' is-small' : ''}${
            !occupied && !tooSmall ? ' is-free' : ''
          }${selected ? ' is-selected' : ''}"
          data-table-select="${table.id}"
          style="--x:${plan.x}%;--y:${plan.y}%;--w:${plan.w}%;--h:${plan.h}%;--chairs:${chairCount};"
          ${disabled ? 'disabled' : ''}
        >
          <span class="table-seat__label">${table.id}</span>
          <span class="table-seat__time">${time}</span>
          <span class="table-seat__state">${status}</span>
        </button>
      `;
    }).join('')}`;
  };

  const selectTable = (tableId) => {
    if (!activeBooking) return;
    const table = getTableById(tableId);
    const people = getPeopleCount(activeBooking);
    if (!table) return;
    if (people > table.seats) return;
    if (isTableBooked(table.id, activeBooking.dateHidden.value, activeBooking.timeHidden.value)) return;

    activeBooking.tableHidden.value = table.id;
    activeBooking.tableTrigger.value = `${table.label} (${table.seats} pers.)`;
    activeBooking.tableTrigger.classList.add('is-filled');
    closeTableModal();
  };

  const selectTime = (value) => {
    if (!activeBooking) return;
    activeBooking.timeHidden.value = value;
    activeBooking.timeTrigger.value = value;
    activeBooking.timeTrigger.classList.add('is-filled');
    selectedTime = value;
    resetTable(activeBooking);
    closeTimeModal();
    openTableModal(activeBooking);
  };

  const selectDate = (date) => {
    if (!activeBooking) return;
    const booking = activeBooking;
    const iso = toISODate(date);
    booking.dateHidden.value = iso;
    booking.dateTrigger.value = fullLabel.format(date);
    booking.dateTrigger.classList.add('is-filled');
    resetTime(booking);
    selectedISO = iso;
    dateModal.hidden = true;
    openTimeModal(booking);
  };

  const nextWeekend = () => {
    const date = new Date(todayStart);
    const day = date.getDay();
    const distance = day === 6 ? 0 : (6 - day + 7) % 7;
    date.setDate(date.getDate() + distance);
    return date;
  };

  const renderCalendar = () => {
    monthTitle.textContent = monthLabel.format(visibleMonth);
    const yearValue = visibleMonth.getFullYear();
    const monthValue = visibleMonth.getMonth();
    const first = new Date(yearValue, monthValue, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const total = 42;
    grid.innerHTML = '';

    for (let i = 0; i < total; i += 1) {
      const date = new Date(yearValue, monthValue, i - startOffset + 1);
      const iso = toISODate(date);
      const isCurrentMonth = date.getMonth() === monthValue;
      const isPast = date < todayStart;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'date-cell';
      if (!isCurrentMonth) button.classList.add('is-out');
      if (isPast) button.classList.add('is-past');
      if (iso === selectedISO) button.classList.add('is-selected');
      button.textContent = String(date.getDate());
      button.title = fullLabel.format(date);

      if (isPast) {
        button.disabled = true;
      } else {
        button.addEventListener('click', () => selectDate(date));
      }

      grid.appendChild(button);
    }
  };

  const renderTimeSlots = (date) => {
    const slots = getSlotsForDate(date);
    timeGrid.innerHTML = '';

    if (!slots.length) {
      timeEmpty.hidden = false;
      return;
    }

    timeEmpty.hidden = true;
    slots.forEach((slot) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-slot';
      if (slot === selectedTime) button.classList.add('is-selected');
      button.textContent = slot;
      button.addEventListener('click', () => selectTime(slot));
      timeGrid.appendChild(button);
    });
  };

  bookingForms.forEach((booking) => {
    if (booking.dateHidden.value) {
      const preset = fromISODate(booking.dateHidden.value);
      if (preset) {
        booking.dateTrigger.value = fullLabel.format(preset);
        booking.dateTrigger.classList.add('is-filled');
      }
    }

    if (booking.timeHidden.value) {
      booking.timeTrigger.value = booking.timeHidden.value;
      booking.timeTrigger.classList.add('is-filled');
    }

    if (booking.tableHidden.value) {
      const table = getTableById(booking.tableHidden.value);
      if (table) {
        booking.tableTrigger.value = `${table.label} (${table.seats} pers.)`;
        booking.tableTrigger.classList.add('is-filled');
      }
    }

    booking.dateTrigger.addEventListener('click', () => openDateModal(booking));
    booking.dateTrigger.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDateModal(booking);
      }
    });

    booking.timeTrigger.addEventListener('click', () => {
      if (!booking.dateHidden.value) {
        openDateModal(booking);
        return;
      }
      openTimeModal(booking);
    });

    booking.timeTrigger.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!booking.dateHidden.value) {
          openDateModal(booking);
        } else {
          openTimeModal(booking);
        }
      }
    });

    booking.tableTrigger.addEventListener('click', () => {
      if (!booking.dateHidden.value) {
        openDateModal(booking);
        return;
      }
      if (!booking.timeHidden.value) {
        openTimeModal(booking);
        return;
      }
      openTableModal(booking);
    });

    booking.tableTrigger.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!booking.dateHidden.value) {
          openDateModal(booking);
          return;
        }
        if (!booking.timeHidden.value) {
          openTimeModal(booking);
          return;
        }
        openTableModal(booking);
      }
    });

    booking.peopleInput.addEventListener('input', () => {
      resetTable(booking);
    });

    booking.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(booking.form);
      const name = String(formData.get('name') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const people = Number.parseInt(String(formData.get('people') || '').trim(), 10);
      const date = String(formData.get('date') || '').trim();
      const time = String(formData.get('time') || '').trim();
      const tableId = String(formData.get('tableId') || '').trim();
      const message = String(formData.get('message') || '').trim();

      if (!name || !email || !date || !time || !tableId || !people) {
        showFeedback(booking, 'Merci de compléter les champs obligatoires.', 'error');
        return;
      }

      if (people < 1 || people > 10) {
        showFeedback(booking, 'Le nombre de personnes doit être entre 1 et 10.', 'error');
        return;
      }

      const table = getTableById(tableId);
      if (!table) {
        showFeedback(booking, 'Table invalide. Merci de sélectionner une table.', 'error');
        return;
      }

      if (people > table.seats) {
        resetTable(booking);
        showFeedback(booking, 'Cette table est trop petite pour ce groupe.', 'error');
        return;
      }

      if (isTableBooked(tableId, date, time)) {
        resetTable(booking);
        showFeedback(
          booking,
          'Cette table vient d\'être réservée. Choisis une autre table pour ce créneau.',
          'error'
        );
        return;
      }

      const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      addReservation({
        id,
        name,
        email,
        people,
        date,
        time,
        tableId,
        tableLabel: table.label,
        tableSeats: table.seats,
        message,
        createdAt: new Date().toISOString(),
      });

      booking.form.reset();
      resetDateAndTime(booking);
      showFeedback(booking, 'Réservation envoyée. Nous te confirmons cela rapidement.');
    });
  });

  dateCloseButtons.forEach((btn) => btn.addEventListener('click', closeDateModal));
  timeCloseButtons.forEach((btn) => btn.addEventListener('click', closeTimeModal));
  tableCloseButtons.forEach((btn) => btn.addEventListener('click', closeTableModal));

  tableLayout.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest('[data-table-select]');
    if (!(button instanceof HTMLElement)) return;
    const tableId = button.getAttribute('data-table-select');
    if (!tableId) return;
    selectTable(tableId);
  });

  prevBtn.addEventListener('click', () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    renderCalendar();
  });

  nextBtn.addEventListener('click', () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  quickButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.getAttribute('data-date-quick');
      const base =
        key === 'today' ? new Date(todayStart) : key === 'tomorrow' ? new Date(todayStart) : nextWeekend();
      if (key === 'tomorrow') base.setDate(base.getDate() + 1);
      selectDate(base);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!tableModal.hidden) {
      closeTableModal();
      return;
    }
    if (!timeModal.hidden) {
      closeTimeModal();
      return;
    }
    if (!dateModal.hidden) {
      closeDateModal();
    }
  });
}

const adminRoot = document.querySelector('[data-admin-page]');

if (adminRoot) {
  const loginForm = adminRoot.querySelector('[data-admin-login]');
  const authBox = adminRoot.querySelector('[data-admin-auth]');
  const dashboard = adminRoot.querySelector('[data-admin-dashboard]');
  const feedback = adminRoot.querySelector('[data-admin-feedback]');
  const countLabel = adminRoot.querySelector('[data-admin-count]');
  const list = adminRoot.querySelector('[data-admin-list]');
  const tableTimeLabel = adminRoot.querySelector('[data-admin-table-time]');
  const tableGrid = adminRoot.querySelector('[data-admin-table-grid]');
  const dateInput = adminRoot.querySelector('[data-admin-date]');
  const timeInput = adminRoot.querySelector('[data-admin-time]');
  const searchInput = adminRoot.querySelector('[data-admin-search]');
  const prevButton = adminRoot.querySelector('[data-admin-prev]');
  const todayButton = adminRoot.querySelector('[data-admin-today]');
  const nextButton = adminRoot.querySelector('[data-admin-next]');
  const logoutButton = adminRoot.querySelector('[data-admin-logout]');

  const isLoggedIn = () => localStorage.getItem(STORAGE_KEYS.adminSession) === '1';

  const showLogin = () => {
    authBox.hidden = false;
    dashboard.hidden = true;
  };

  const showDashboard = () => {
    authBox.hidden = true;
    dashboard.hidden = false;
  };

  const getReservationRangeText = (reservation) => {
    const start = toMinutes(reservation.time);
    const end = start + 120;
    return `${fromMinutes(start)} - ${fromMinutes(end)}`;
  };

  const getOccupationAt = (tableId, dateISO, atTime) => {
    const point = toMinutes(atTime);
    const reservations = readReservations()
      .filter((item) => item.date === dateISO && item.tableId === tableId)
      .sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

    return reservations.find((reservation) => {
      const start = toMinutes(reservation.time);
      const end = start + 120;
      return point >= start && point < end;
    });
  };

  const renderAdmin = () => {
    const selectedDate = dateInput.value || toISODate(new Date());
    const selectedTime = timeInput.value || roundCurrentTimeToHalfHour();
    const term = (searchInput.value || '').trim().toLowerCase();

    const filteredReservations = readReservations()
      .filter((item) => item.date === selectedDate)
      .filter((item) => {
        if (!term) return true;
        const combined = `${item.name || ''} ${item.email || ''} ${item.tableLabel || ''} ${item.tableId || ''}`;
        return combined.toLowerCase().includes(term);
      })
      .sort((a, b) => {
        const timeA = toMinutes(a.time);
        const timeB = toMinutes(b.time);
        if (timeA !== timeB) return timeA - timeB;
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      });

    countLabel.textContent = `${filteredReservations.length} réservation${filteredReservations.length > 1 ? 's' : ''} pour ${formatISODateLong(selectedDate)}`;

    if (!filteredReservations.length) {
      list.innerHTML = '<p class="admin-empty">Aucune réservation trouvée pour cette date.</p>';
    } else {
      list.innerHTML = filteredReservations
        .map(
          (item) => `
            <article class="reservation-card">
              <div class="reservation-card__head">
                <h4>${escapeHTML(item.name)}</h4>
                <button type="button" class="btn btn-ghost reservation-delete" data-reservation-delete="${escapeHTML(item.id)}">
                  Supprimer
                </button>
              </div>
              <p><strong>Email :</strong> ${escapeHTML(item.email)}</p>
              <p><strong>Date :</strong> ${escapeHTML(formatISODateLong(item.date))}</p>
              <p><strong>Horaire :</strong> ${escapeHTML(getReservationRangeText(item))}</p>
              <p><strong>Personnes :</strong> ${escapeHTML(item.people || '?')}</p>
              <p><strong>Table :</strong> ${escapeHTML(item.tableLabel || item.tableId || 'Non définie')}</p>
              <p><strong>Message :</strong> ${escapeHTML(item.message || 'Aucun message')}</p>
            </article>
          `
        )
        .join('');
    }

    tableTimeLabel.textContent = `État des tables le ${formatISODateLong(selectedDate)} à ${selectedTime}`;

    const decorations = `
      <div class="table-floor__bar">BAR</div>
      <div class="table-floor__pillar table-floor__pillar--one"></div>
      <div class="table-floor__pillar table-floor__pillar--two"></div>
      <div class="table-floor__stair" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
    `;

    tableGrid.innerHTML = `${decorations}${TABLES.map((table) => {
      const occupation = getOccupationAt(table.id, selectedDate, selectedTime);
      const isBusy = Boolean(occupation);
      const plan = TABLE_PLAN[table.id] || { x: 10, y: 10, w: 12, h: 10, shape: 'square' };
      const chairCount = Math.max(2, Math.min(6, table.seats));
      const status = isBusy ? 'Réservée' : 'Libre';
      const shownTime = isBusy ? occupation.time : selectedTime;

      return `
        <button
          type="button"
          class="table-seat table-seat--${plan.shape}${isBusy ? ' is-busy' : ' is-free'}"
          style="--x:${plan.x}%;--y:${plan.y}%;--w:${plan.w}%;--h:${plan.h}%;--chairs:${chairCount};"
          disabled
        >
          <span class="table-seat__label">${escapeHTML(table.id)}</span>
          <span class="table-seat__time">${escapeHTML(shownTime)}</span>
          <span class="table-seat__state">${escapeHTML(status)}</span>
        </button>
      `;
    }).join('')}`;
  };

  const initAdmin = () => {
    const todayISO = toISODate(new Date());
    dateInput.value = todayISO;
    timeInput.value = roundCurrentTimeToHalfHour();

    if (isLoggedIn()) {
      showDashboard();
      renderAdmin();
    } else {
      showLogin();
    }
  };

  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const username = String(formData.get('username') || '').trim();
      const password = String(formData.get('password') || '').trim();

      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        localStorage.setItem(STORAGE_KEYS.adminSession, '1');
        feedback.textContent = '';
        showDashboard();
        renderAdmin();
      } else {
        feedback.textContent = 'Identifiants invalides.';
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEYS.adminSession);
      if (loginForm) loginForm.reset();
      if (feedback) feedback.textContent = '';
      showLogin();
    });
  }

  if (list) {
    list.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const id = target.getAttribute('data-reservation-delete');
      if (!id) return;
      removeReservation(id);
      renderAdmin();
    });
  }

  [dateInput, timeInput, searchInput].forEach((field) => {
    field.addEventListener('input', () => renderAdmin());
  });

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      dateInput.value = shiftISODate(dateInput.value, -1);
      renderAdmin();
    });
  }

  if (todayButton) {
    todayButton.addEventListener('click', () => {
      dateInput.value = toISODate(new Date());
      renderAdmin();
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      dateInput.value = shiftISODate(dateInput.value, 1);
      renderAdmin();
    });
  }

  initAdmin();
}
