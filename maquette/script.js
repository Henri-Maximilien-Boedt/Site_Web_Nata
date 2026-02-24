const menuBtn = document.querySelector('.menu-btn');
const nav = document.querySelector('.nav');
const year = document.getElementById('year');

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

const bookingForms = Array.from(document.querySelectorAll('.booking-form'))
  .map((form) => ({
    form,
    dateHidden: form.querySelector('[data-date-value]'),
    dateTrigger: form.querySelector('[data-date-trigger]'),
    timeHidden: form.querySelector('[data-time-value]'),
    timeTrigger: form.querySelector('[data-time-trigger]'),
  }))
  .filter((entry) => entry.dateHidden && entry.dateTrigger && entry.timeHidden && entry.timeTrigger);

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

  const toISO = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fromISO = (value) => {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const toMinutes = (hours, minutes) => hours * 60 + minutes;
  const fromMinutes = (totalMinutes) => {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  const getSlotsForDate = (date) => {
    if (!date) return [];
    const day = date.getDay();
    if (day === 0) return [];
    const periods =
      day === 1
        ? [
            [18, 0, 22, 0],
          ]
        : [
            [12, 0, 14, 30],
            [18, 0, 22, 0],
          ];
    const slots = [];
    periods.forEach(([sh, sm, eh, em]) => {
      const start = toMinutes(sh, sm);
      const end = toMinutes(eh, em);
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
  let activeBooking = null;
  let visibleMonth = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  let selectedISO = '';
  let selectedTime = '';

  const openDateModal = (booking) => {
    activeBooking = booking;
    selectedISO = booking.dateHidden.value || '';
    const selectedDate = fromISO(selectedISO);
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
    const date = fromISO(booking.dateHidden.value);
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

  const resetTime = (booking) => {
    booking.timeHidden.value = '';
    booking.timeTrigger.value = '';
    booking.timeTrigger.classList.remove('is-filled');
    booking.timeTrigger.placeholder = 'Choisis une heure disponible';
  };

  const selectTime = (value) => {
    if (!activeBooking) return;
    activeBooking.timeHidden.value = value;
    activeBooking.timeTrigger.value = value;
    activeBooking.timeTrigger.classList.add('is-filled');
    selectedTime = value;
    closeTimeModal();
  };

  const selectDate = (date) => {
    if (!activeBooking) return;
    const booking = activeBooking;
    const iso = toISO(date);
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
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const total = 42;
    grid.innerHTML = '';

    for (let i = 0; i < total; i += 1) {
      const date = new Date(year, month, i - startOffset + 1);
      const iso = toISO(date);
      const isCurrentMonth = date.getMonth() === month;
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
      const preset = fromISO(booking.dateHidden.value);
      if (preset) {
        booking.dateTrigger.value = fullLabel.format(preset);
        booking.dateTrigger.classList.add('is-filled');
      }
    }
    if (booking.timeHidden.value) {
      booking.timeTrigger.value = booking.timeHidden.value;
      booking.timeTrigger.classList.add('is-filled');
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
  });

  dateCloseButtons.forEach((btn) => btn.addEventListener('click', closeDateModal));
  timeCloseButtons.forEach((btn) => btn.addEventListener('click', closeTimeModal));
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
    if (!timeModal.hidden) {
      closeTimeModal();
      return;
    }
    if (!dateModal.hidden) {
      closeDateModal();
    }
  });
}
