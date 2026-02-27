const menuBtn = document.querySelector('.menu-btn');
const nav = document.querySelector('.nav');
const year = document.getElementById('year');

const STORAGE_KEYS = {
  reservations: 'nata_reservations_v1',
  adminSession: 'nata_admin_session_v1',
  adminBlocks: 'nata_admin_blocks_v1',
  tableLayout: 'nata_table_layout_v2',
  tableMerges: 'nata_table_merges_v1',
};

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'Nata2026!',
};

const TABLES = [
  { id: 'T2-1', code: 'T-1', seats: 2, label: 'T-1' },
  { id: 'T2-2', code: 'T-2', seats: 2, label: 'T-2' },
  { id: 'T2-3', code: 'T-3', seats: 2, label: 'T-3' },
  { id: 'T2-4', code: 'T-4', seats: 2, label: 'T-4' },
  { id: 'T2-5', code: 'T-5', seats: 2, label: 'T-5' },
  { id: 'T4-1', code: 'T-6', seats: 4, label: 'T-6' },
  { id: 'T4-2', code: 'T-7', seats: 4, label: 'T-7' },
  { id: 'T4-3', code: 'T-8', seats: 4, label: 'T-8' },
  { id: 'T4-4', code: 'T-9', seats: 4, label: 'T-9' },
  { id: 'T10-1', code: 'T-10', seats: 10, label: 'T-10' },
];

const TABLE_PLAN = {
  'T2-1': { x: 7, y: 12, w: 11, h: 12, shape: 'rect' },
  'T2-2': { x: 7, y: 31, w: 11, h: 12, shape: 'rect' },
  'T2-3': { x: 7, y: 50, w: 11, h: 12, shape: 'rect' },
  'T2-4': { x: 8, y: 74, w: 11, h: 12, shape: 'rect' },
  'T2-5': { x: 21, y: 74, w: 11, h: 12, shape: 'rect' },
  'T4-1': { x: 24, y: 12, w: 11, h: 22, shape: 'rect' },
  'T4-2': { x: 54, y: 12, w: 11, h: 22, shape: 'rect' },
  'T4-3': { x: 24, y: 31, w: 11, h: 22, shape: 'rect' },
  'T4-4': { x: 24, y: 50, w: 11, h: 22, shape: 'rect' },
  'T10-1': { x: 82, y: 82, w: 11, h: 24, shape: 'rect' },
};

const TABLE_BY_ID = Object.fromEntries(TABLES.map((table) => [table.id, table]));

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const getTableCode = (tableId) => TABLE_BY_ID[tableId]?.code || tableId;
const getTableRectSize = (seats) => ({
  w: 11,
  h: clamp(8 + seats * 1.6, 12, 30),
});

const readTableLayout = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.tableLayout);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeTableLayout = (layout) => {
  localStorage.setItem(STORAGE_KEYS.tableLayout, JSON.stringify(layout));
};

const readTableMerges = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.tableMerges);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeTableMerges = (groups) => {
  localStorage.setItem(STORAGE_KEYS.tableMerges, JSON.stringify(groups));
};

const normalizeMergeGroups = (groups) => {
  const validGroups = groups
    .filter((group) => Array.isArray(group))
    .map((group) =>
      Array.from(
        new Set(
          group
            .map((id) => String(id || '').trim())
            .filter((id) => id && TABLE_BY_ID[id])
        )
      )
    )
    .filter((group) => group.length > 1);

  const merged = [];
  validGroups.forEach((group) => {
    const touching = merged.filter((existing) => existing.some((id) => group.includes(id)));
    if (!touching.length) {
      merged.push([...group]);
      return;
    }
    const combined = new Set(group);
    touching.forEach((existing) => existing.forEach((id) => combined.add(id)));
    for (let index = merged.length - 1; index >= 0; index -= 1) {
      if (touching.includes(merged[index])) merged.splice(index, 1);
    }
    merged.push(Array.from(combined));
  });

  return merged
    .map((group) => group.sort())
    .sort((a, b) => a[0].localeCompare(b[0]));
};

const getTableLayout = () => {
  const saved = readTableLayout();
  const layout = {};

  TABLES.forEach((table) => {
    const base = TABLE_PLAN[table.id] || { x: 10, y: 10, w: 12, h: 10, shape: 'rect' };
    const custom = saved[table.id] && typeof saved[table.id] === 'object' ? saved[table.id] : {};
    const size = getTableRectSize(table.seats);
    const x = Number(custom.x ?? base.x);
    const y = Number(custom.y ?? base.y);
    layout[table.id] = {
      x: clamp(Number.isFinite(x) ? x : base.x, 3, 97),
      y: clamp(Number.isFinite(y) ? y : base.y, 3, 97),
      w: size.w,
      h: size.h,
      shape: 'rect',
    };
  });

  return layout;
};

const getTableGroups = () => {
  const mergeGroups = normalizeMergeGroups(readTableMerges());
  const linked = new Set(mergeGroups.flat());
  const singles = TABLES.map((table) => table.id)
    .filter((id) => !linked.has(id))
    .map((id) => [id]);
  return [...mergeGroups, ...singles];
};

const hasSameMembers = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
};

const getMergedUnitCode = (sortedMembers, mergedGroups) => {
  const groupIndex = mergedGroups.findIndex((group) => hasSameMembers(group, sortedMembers));
  return `T-G${groupIndex >= 0 ? groupIndex + 1 : 1}`;
};

const getMembersFromUnitId = (unitId) => {
  const value = String(unitId || '').trim();
  if (!value) return [];
  if (value.startsWith('GROUP:')) {
    return value
      .slice(6)
      .split('+')
      .map((id) => id.trim())
      .filter((id) => Boolean(TABLE_BY_ID[id]))
      .sort();
  }
  return TABLE_BY_ID[value] ? [value] : [];
};

const buildTableUnitFromMembers = (members, layout = getTableLayout(), mergedGroups = []) => {
  const sortedMembers = [...members].sort();
  const memberTables = sortedMembers.map((id) => TABLE_BY_ID[id]).filter(Boolean);
  const seats = memberTables.reduce((sum, table) => sum + table.seats, 0);
  const isMerged = sortedMembers.length > 1;

  if (!isMerged) {
    const onlyId = sortedMembers[0];
    const table = TABLE_BY_ID[onlyId];
    return {
      id: onlyId,
      label: table?.code || onlyId,
      displayCode: table?.code || onlyId,
      seats: table?.seats || 0,
      members: sortedMembers,
      isMerged: false,
      plan: layout[onlyId] || TABLE_PLAN[onlyId],
    };
  }

  const bounds = sortedMembers.reduce(
    (acc, id) => {
      const item = layout[id];
      if (!item) return acc;
      const left = item.x - item.w / 2;
      const right = item.x + item.w / 2;
      const top = item.y - item.h / 2;
      const bottom = item.y + item.h / 2;
      return {
        left: Math.min(acc.left, left),
        right: Math.max(acc.right, right),
        top: Math.min(acc.top, top),
        bottom: Math.max(acc.bottom, bottom),
      };
    },
    { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  );

  const plan = {
    x: (bounds.left + bounds.right) / 2,
    y: (bounds.top + bounds.bottom) / 2,
    w: clamp(bounds.right - bounds.left, 12, 60),
    h: clamp(bounds.bottom - bounds.top, 10, 45),
    shape: 'rect',
  };

  const mergedCode = getMergedUnitCode(sortedMembers, mergedGroups);
  return {
    id: `GROUP:${sortedMembers.join('+')}`,
    label: mergedCode,
    displayCode: mergedCode,
    seats,
    members: sortedMembers,
    isMerged: true,
    plan,
  };
};

const getTableUnits = (layout = getTableLayout()) => {
  const groups = getTableGroups(layout).map((members) => [...members].sort());
  const mergedGroups = groups
    .filter((group) => group.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0]));
  return groups.map((members) => buildTableUnitFromMembers(members, layout, mergedGroups));
};

const getUnitById = (unitId, layout = getTableLayout()) =>
  getTableUnits(layout).find((unit) => unit.id === unitId);

const getGroupForMember = (memberId, groups = normalizeMergeGroups(readTableMerges())) =>
  groups.find((group) => group.includes(memberId)) || null;

const mergeTablesById = (sourceId, targetId) => {
  if (!TABLE_BY_ID[sourceId] || !TABLE_BY_ID[targetId] || sourceId === targetId) return null;
  const groups = normalizeMergeGroups(readTableMerges());
  const sourceGroup = getGroupForMember(sourceId, groups);
  const targetGroup = getGroupForMember(targetId, groups);

  if (sourceGroup && targetGroup && sourceGroup === targetGroup) {
    return sourceGroup;
  }

  const nextGroups = groups.filter((group) => group !== sourceGroup && group !== targetGroup);
  const mergedGroup = Array.from(
    new Set([...(sourceGroup || [sourceId]), ...(targetGroup || [targetId])])
  ).sort();
  nextGroups.push(mergedGroup);
  writeTableMerges(normalizeMergeGroups(nextGroups));
  return mergedGroup;
};

const splitGroupByMember = (memberId) => {
  const groups = normalizeMergeGroups(readTableMerges());
  const sourceGroup = getGroupForMember(memberId, groups);
  if (!sourceGroup) return false;
  const nextGroups = groups.filter((group) => group !== sourceGroup);
  if (sourceGroup.length > 2) {
    const rest = sourceGroup.filter((id) => id !== memberId);
    if (rest.length > 1) nextGroups.push(rest);
  }
  writeTableMerges(normalizeMergeGroups(nextGroups));
  return true;
};

const splitGroupByMembers = (members) => {
  const target = [...members].sort();
  if (target.length < 2) return false;
  const groups = normalizeMergeGroups(readTableMerges());
  const sourceGroup = groups.find((group) => hasSameMembers(group, target));
  if (!sourceGroup) return false;
  const nextGroups = groups.filter((group) => group !== sourceGroup);
  writeTableMerges(normalizeMergeGroups(nextGroups));
  return true;
};

const mergeUnitsById = (sourceUnitId, targetUnitId) => {
  const sourceMembers = getMembersFromUnitId(sourceUnitId);
  const targetMembers = getMembersFromUnitId(targetUnitId);
  if (!sourceMembers.length || !targetMembers.length) return null;
  if (sourceMembers.some((memberId) => targetMembers.includes(memberId))) return null;

  const anchorId = sourceMembers[0];
  let mergedGroup = null;
  targetMembers.forEach((targetMemberId) => {
    const next = mergeTablesById(anchorId, targetMemberId);
    if (next) mergedGroup = next;
  });

  return mergedGroup ? [...mergedGroup].sort() : null;
};

const alignMergedGroupLayout = (group, anchorId) => {
  if (!Array.isArray(group) || group.length < 2) return;
  const layout = getTableLayout();
  const anchor = layout[anchorId] || layout[group[0]];
  if (!anchor) return;

  const ordered = [anchorId, ...group.filter((id) => id !== anchorId)];
  const totalHeight = ordered.reduce((sum, tableId) => {
    const item = layout[tableId];
    return sum + (item ? item.h : 0);
  }, 0);
  if (!totalHeight) return;

  let cursor = anchor.y - totalHeight / 2;
  ordered.forEach((tableId) => {
    const item = layout[tableId];
    if (!item) return;
    const halfW = item.w / 2;
    const halfH = item.h / 2;
    item.x = clamp(anchor.x, halfW + 1, 99 - halfW);
    item.y = clamp(cursor + item.h / 2, halfH + 1, 99 - halfH);
    cursor += item.h;
  });

  writeTableLayout(layout);
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
const normalizeRange = (start, end) => (end <= start ? [start, end + 1440] : [start, end]);

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

const TABLE_FLOOR_DECORATIONS = `
  <div class="table-floor__bar" aria-hidden="true">
    <span class="table-floor__bar-title">BAR</span>
    <span class="table-floor__bar-shelf table-floor__bar-shelf--one"></span>
    <span class="table-floor__bar-shelf table-floor__bar-shelf--two"></span>
    <span class="table-floor__bar-obj table-floor__bar-obj--bottle"></span>
    <span class="table-floor__bar-obj table-floor__bar-obj--glass"></span>
    <span class="table-floor__bar-obj table-floor__bar-obj--shaker"></span>
  </div>
  <div class="table-floor__entrance" aria-hidden="true">
    <span class="table-floor__entrance-label">ENTREE</span>
    <span class="table-floor__entrance-arrow">↓</span>
  </div>
`;

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

const initHomeFeatureCards = () => {
  const toggle = document.querySelector('[data-events-toggle]');
  const details = document.querySelector('[data-events-details]');
  if (!toggle || !details) return;

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    details.hidden = isOpen;
  });
};

initHomeFeatureCards();

const MENU_DESCRIPTIONS = {
  Gyoza: 'Raviolis japonais grillés, croustillants dehors et fondants dedans.',
  Mandu: 'Raviolis coréens généreux, servis chauds.',
  'Korean Pancakes': 'Pancakes coréens salés, dorés à la poêle.',
  'Kimchi Jeon': 'Pancake coréen au kimchi, légèrement épicé.',
  'Haemul Jeon': 'Pancake coréen aux fruits de mer.',
  Kimbap: 'Roulés coréens de riz et garnitures.',
  'Fried Popcorn Chicken': 'Morceaux de poulet frits, croustillants et sauce au choix.',
  'Korean Fried Chicken (Bone-in)': 'Poulet frit coréen avec os, très croustillant.',
  Japchae: 'Nouilles de patate douce sautées aux légumes.',
  Bibimbap: 'Bol de riz chaud, légumes et garniture au choix.',
  'Korean Meal Set': 'Plateau complet coréen avec accompagnements.',
  'Grillades / BBQ Coréen': 'Viande grillée servie avec riz, légumes et salade.',
  Tteokbokki: 'Gâteaux de riz coréens dans une sauce relevée.',
  'Suppléments': 'Ajouts à la carte selon vos envies.',
  Bungeobang: 'Gaufre coréenne servie avec glace vanille.',
  'Pannacotta Mangue Coco': 'Panna cotta douce aux notes mangue et coco.',
  Tiramisu: 'Dessert crémeux et onctueux.',
  'Glace Melona': 'Glace coréenne parfumée melon ou mangue.',
  'Glace en boule': 'Boules de glace artisanales, parfums au choix.',
  'Mojito Classique': 'Rhum, menthe, lime et soda.',
  'Mojito Passion': 'Version tropicale au fruit de la passion.',
  'Mojito Mangue': 'Version fruitée à la mangue.',
  'Moscow Mule': 'Vodka, lime et ginger beer.',
  'Gin Tonic': 'Cocktail classique gin et tonic.',
  'Cuba Libre': 'Rhum, cola et lime.',
  'Pina Colada': 'Cocktail onctueux coco-ananas.',
  'Aperol Spritz': 'Aperol, bulles et soda.',
  'Lychee Soju': 'Cocktail soju au litchi.',
  'Apple Melona Soju': 'Soju pomme avec note glacée melon.',
  'Strawberry Milkis': 'Soju fraise avec Milkis.',
  'Grapefruit Highball': 'Highball soju pamplemousse.',
  'Classic High Ball': 'Soju et tonic en version classique.',
  'Korean Mule': 'Soju, yuzu et ginger beer.',
  'Soju Spritz': 'Soju yuzu allongé au prosecco et soda.',
  'Yuja Spritz': 'Spritz au yuja, frais et agrumé.',
  'NATA K-Cloud Sunset': 'Signature maison aux notes fruitées et lactées.',
  'NATA Pink Highball': 'Signature soju, pink tonic et lime.',
  'NATA Yakult High': 'Signature soju fraise et Yakult.',
  'NATA Blue Butterfly': 'Signature florale au gin infusé.',
  'Basil Smash': 'Gin, basilic et agrumes.',
};

const normalizeMenuKey = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const menuDescriptionEntries = Object.entries(MENU_DESCRIPTIONS).reduce((acc, [key, value]) => {
  acc[normalizeMenuKey(key)] = value;
  return acc;
}, {});

const initMenuDescriptions = () => {
  if (!document.body.classList.contains('menu-page')) return;

  const clickableItems = document.querySelectorAll('.menu-card h3, .drinks-block .plain-list li');
  if (!clickableItems.length) return;

  const modal = document.createElement('div');
  modal.className = 'menu-desc-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="menu-desc-modal__backdrop" data-desc-close></div>
    <div class="menu-desc-modal__panel" role="dialog" aria-modal="true" aria-labelledby="menu-desc-title">
      <button type="button" class="date-close" data-desc-close>Fermer</button>
      <h3 id="menu-desc-title" class="menu-desc-modal__title"></h3>
      <p class="menu-desc-modal__text"></p>
    </div>
  `;
  document.body.appendChild(modal);

  const title = modal.querySelector('.menu-desc-modal__title');
  const text = modal.querySelector('.menu-desc-modal__text');

  const closeModal = () => {
    modal.hidden = true;
  };

  const openModal = (itemName, description) => {
    title.textContent = itemName;
    text.textContent = description;
    text.hidden = false;
    modal.hidden = false;
  };

  clickableItems.forEach((item) => {
    const itemName = item.textContent.trim();
    const description = menuDescriptionEntries[normalizeMenuKey(itemName)];
    if (!description) return;

    item.classList.add('menu-clickable');
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    item.addEventListener('click', () => openModal(itemName, description));
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal(itemName, description);
      }
    });
  });

  modal.querySelectorAll('[data-desc-close]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });
};

initMenuDescriptions();

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

const readAdminBlocks = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.adminBlocks);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAdminBlocks = (blocks) => {
  localStorage.setItem(STORAGE_KEYS.adminBlocks, JSON.stringify(blocks));
};

const addAdminBlock = (payload) => {
  const blocks = readAdminBlocks();
  blocks.unshift(payload);
  writeAdminBlocks(blocks);
};

const removeAdminBlock = (id) => {
  const blocks = readAdminBlocks().filter((item) => item.id !== id);
  writeAdminBlocks(blocks);
};

const getTableById = (id) => TABLES.find((table) => table.id === id);
const getReservationMembers = (reservation) => {
  if (Array.isArray(reservation.tableMembers) && reservation.tableMembers.length) {
    return reservation.tableMembers.filter((id) => Boolean(TABLE_BY_ID[id]));
  }
  const tableId = String(reservation.tableId || '').trim();
  if (tableId.startsWith('GROUP:')) {
    return tableId
      .slice(6)
      .split('+')
      .map((id) => id.trim())
      .filter((id) => Boolean(TABLE_BY_ID[id]));
  }
  return TABLE_BY_ID[tableId] ? [tableId] : [];
};

const isTableBooked = (tableId, dateISO, timeHHMM, ignoreReservationId = '') => {
  const targetStart = toMinutes(timeHHMM);
  const targetEnd = targetStart + 120;

  const hasReservationOverlap = readReservations().some((reservation) => {
    if (ignoreReservationId && reservation.id === ignoreReservationId) return false;
    if (reservation.date !== dateISO) return false;
    const members = getReservationMembers(reservation);
    if (!members.includes(tableId)) return false;
    const start = toMinutes(reservation.time);
    const end = start + 120;
    return overlaps(targetStart, targetEnd, start, end);
  });

  if (hasReservationOverlap) return true;

  return readAdminBlocks().some((block) => {
    if (block.date !== dateISO) return false;
    if (block.tableId !== tableId) return false;
    const start = toMinutes(block.startTime);
    const rawEnd =
      Number.isFinite(Number(block.endMinutes)) && Number(block.endMinutes) > 0
        ? Number(block.endMinutes)
        : toMinutes(block.endTime);
    const [, end] = normalizeRange(start, rawEnd);
    return overlaps(targetStart, targetEnd, start, end);
  });
};

const bookingForms = Array.from(document.querySelectorAll('.booking-form'))
  .map((form) => {
    let tableMembersHidden = form.querySelector('[data-table-members]');
    if (!tableMembersHidden) {
      tableMembersHidden = document.createElement('input');
      tableMembersHidden.type = 'hidden';
      tableMembersHidden.name = 'tableMembers';
      tableMembersHidden.setAttribute('data-table-members', '');
      form.appendChild(tableMembersHidden);
    }

    return {
      form,
      dateHidden: form.querySelector('[data-date-value]'),
      dateTrigger: form.querySelector('[data-date-trigger]'),
      timeHidden: form.querySelector('[data-time-value]'),
      timeTrigger: form.querySelector('[data-time-trigger]'),
      tableHidden: form.querySelector('[data-table-value]'),
      tableMembersHidden,
      tableTrigger: form.querySelector('[data-table-trigger]'),
      peopleInput: form.querySelector('input[name="people"]'),
    };
  })
  .filter(
    (entry) =>
      entry.dateHidden &&
      entry.dateTrigger &&
      entry.timeHidden &&
      entry.timeTrigger &&
      entry.tableHidden &&
      entry.tableMembersHidden &&
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
    booking.tableMembersHidden.value = '';
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

  const isUnitBooked = (members, dateISO, timeHHMM) =>
    members.some((memberId) => isTableBooked(memberId, dateISO, timeHHMM));

  const renderTablePlan = (booking) => {
    const date = booking.dateHidden.value;
    const time = booking.timeHidden.value;
    const people = getPeopleCount(booking);
    const units = getTableUnits();
    tableInfo.textContent = `Créneau: ${formatISODateLong(date)} à ${time} (2h) - ${people} personne${people > 1 ? 's' : ''}`;

    tableLayout.innerHTML = `${TABLE_FLOOR_DECORATIONS}${units.map((unit) => {
      const occupied = isUnitBooked(unit.members, date, time);
      const tooSmall = !occupied && people > unit.seats;
      const selected = booking.tableHidden.value === unit.id;
      const disabled = occupied || tooSmall;
      const plan = unit.plan || { x: 10, y: 10, w: 12, h: 10, shape: 'rect' };
      const leftChairs = Math.max(1, Math.ceil(unit.seats / 2));
      const rightChairs = Math.max(1, Math.floor(unit.seats / 2));

      return `
        <button
          type="button"
          class="table-seat table-seat--${plan.shape}${occupied ? ' is-busy' : ''}${tooSmall ? ' is-small' : ''}${
            !occupied && !tooSmall ? ' is-free' : ''
          }${selected ? ' is-selected' : ''}"
          data-table-select="${unit.id}"
          style="--x:${plan.x}%;--y:${plan.y}%;--w:${plan.w}%;--h:${plan.h}%;--chairs-left:${leftChairs};--chairs-right:${rightChairs};"
          ${disabled ? 'disabled' : ''}
        >
          <span class="table-seat__label">${escapeHTML(unit.displayCode || unit.label || unit.id)}</span>
          <span class="table-seat__capacity">${escapeHTML(String(unit.seats))}</span>
        </button>
      `;
    }).join('')}`;
  };

  const selectTable = (unitId) => {
    if (!activeBooking) return;
    const unit = getUnitById(unitId);
    const people = getPeopleCount(activeBooking);
    if (!unit) return;
    if (people > unit.seats) return;
    if (isUnitBooked(unit.members, activeBooking.dateHidden.value, activeBooking.timeHidden.value)) return;

    activeBooking.tableHidden.value = unit.id;
    activeBooking.tableMembersHidden.value = unit.members.join(',');
    activeBooking.tableTrigger.value = `${unit.label} (${unit.seats} pers.)`;
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
      const selectedUnit = getUnitById(booking.tableHidden.value);
      const fallbackTable = getTableById(booking.tableHidden.value);
      if (selectedUnit) {
        booking.tableMembersHidden.value = selectedUnit.members.join(',');
        booking.tableTrigger.value = `${selectedUnit.label} (${selectedUnit.seats} pers.)`;
        booking.tableTrigger.classList.add('is-filled');
      } else if (fallbackTable) {
        booking.tableMembersHidden.value = fallbackTable.id;
        booking.tableTrigger.value = `${fallbackTable.label} (${fallbackTable.seats} pers.)`;
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
      const phone = String(formData.get('phone') || '').trim();
      const people = Number.parseInt(String(formData.get('people') || '').trim(), 10);
      const date = String(formData.get('date') || '').trim();
      const time = String(formData.get('time') || '').trim();
      const tableId = String(formData.get('tableId') || '').trim();
      const tableMembersRaw = String(formData.get('tableMembers') || '').trim();
      const message = String(formData.get('message') || '').trim();

      if (!name || !email || !phone || !date || !time || !tableId || !people) {
        showFeedback(booking, 'Merci de compléter les champs obligatoires.', 'error');
        return;
      }

      if (people < 1 || people > 10) {
        showFeedback(booking, 'Le nombre de personnes doit être entre 1 et 10.', 'error');
        return;
      }

      const parsedMembers = tableMembersRaw
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id && getTableById(id));
      const tableUnit = getUnitById(tableId);
      const fallbackTable = getTableById(tableId);
      const parsedSeats = parsedMembers.reduce((sum, id) => sum + (getTableById(id)?.seats || 0), 0);
      const parsedLabel =
        parsedMembers.length > 1
          ? getUnitById(`GROUP:${parsedMembers.slice().sort().join('+')}`)?.label || 'T-G'
          : parsedMembers.length === 1
            ? getTableById(parsedMembers[0])?.label || parsedMembers[0]
            : '';
      const selectedMembers = parsedMembers.length
        ? parsedMembers
        : tableUnit
          ? tableUnit.members
          : fallbackTable
            ? [fallbackTable.id]
            : [];
      const tableSeats = tableUnit ? tableUnit.seats : fallbackTable ? fallbackTable.seats : parsedSeats;
      const tableLabel = tableUnit ? tableUnit.label : fallbackTable ? fallbackTable.label : parsedLabel;

      if (!selectedMembers.length || !tableLabel) {
        showFeedback(booking, 'Table invalide. Merci de sélectionner une table.', 'error');
        return;
      }

      if (people > tableSeats) {
        resetTable(booking);
        showFeedback(booking, 'Cette table est trop petite pour ce groupe.', 'error');
        return;
      }

      if (selectedMembers.some((memberId) => isTableBooked(memberId, date, time))) {
        resetTable(booking);
        showFeedback(
          booking,
          'Cette table n\'est plus disponible sur ce créneau. Choisis une autre table.',
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
        phone,
        people,
        date,
        time,
        tableId,
        tableLabel,
        tableSeats,
        tableMembers: selectedMembers,
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

  window.addEventListener('storage', (event) => {
    const key = event.key || '';
    const syncKeys = new Set([
      STORAGE_KEYS.tableLayout,
      STORAGE_KEYS.tableMerges,
      STORAGE_KEYS.reservations,
      STORAGE_KEYS.adminBlocks,
    ]);
    if (key && !syncKeys.has(key)) return;
    if (!activeBooking || tableModal.hidden) return;

    const selectedUnitId = activeBooking.tableHidden.value;
    if (selectedUnitId) {
      const refreshedUnit = getUnitById(selectedUnitId);
      if (!refreshedUnit) {
        resetTable(activeBooking);
      } else {
        activeBooking.tableMembersHidden.value = refreshedUnit.members.join(',');
        activeBooking.tableTrigger.value = `${refreshedUnit.label} (${refreshedUnit.seats} pers.)`;
      }
    }

    renderTablePlan(activeBooking);
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
  const slotStrip = adminRoot.querySelector('[data-admin-slots]');
  const timeline = adminRoot.querySelector('[data-admin-timeline]');
  const actionFeedback = adminRoot.querySelector('[data-admin-action-feedback]');
  const mergeModeButton = adminRoot.querySelector('[data-admin-merge-mode]');
  const dateInput = adminRoot.querySelector('[data-admin-date]');
  const searchInput = adminRoot.querySelector('[data-admin-search]');
  const prevButton = adminRoot.querySelector('[data-admin-prev]');
  const todayButton = adminRoot.querySelector('[data-admin-today]');
  const nextButton = adminRoot.querySelector('[data-admin-next]');
  const logoutButton = adminRoot.querySelector('[data-admin-logout]');
  const EVENING_SLOTS = Array.from({ length: 9 }, (_, index) => fromMinutes(18 * 60 + index * 30));
  const ADMIN_HELP_DEFAULT =
    'Glisse une table pour la déplacer. Active le mode fusion (ou clic droit) pour fusionner. Clic gauche sur une table libre pour la marquer indisponible (2h).';
  const ADMIN_HELP_MERGE =
    'Mode fusion actif: clique une 1re table puis une 2e table pour les fusionner.';
  let selectedTime = EVENING_SLOTS.includes(roundCurrentTimeToHalfHour())
    ? roundCurrentTimeToHalfHour()
    : EVENING_SLOTS[0];
  let quickMergeMode = false;
  let quickMergeSourceId = '';
  const mergeMenu = document.createElement('div');
  mergeMenu.className = 'admin-merge-menu';
  mergeMenu.hidden = true;
  mergeMenu.innerHTML = '<div class="admin-merge-menu__list" data-merge-menu-list></div>';
  document.body.appendChild(mergeMenu);
  const mergeMenuList = mergeMenu.querySelector('[data-merge-menu-list]');
  let mergeMenuSourceId = '';

  const isLoggedIn = () => localStorage.getItem(STORAGE_KEYS.adminSession) === '1';
  const getUnitDisplayCodeById = (unitId, layout = getTableLayout()) => {
    const unit = getUnitById(unitId, layout);
    if (unit) return unit.displayCode || unit.label || unit.id;
    const members = getMembersFromUnitId(unitId);
    if (!members.length) return unitId;
    if (members.length === 1) return getTableCode(members[0]);
    return 'T-G';
  };
  const getCurrentAdminHelp = () => {
    if (!quickMergeMode) return ADMIN_HELP_DEFAULT;
    if (!quickMergeSourceId) return ADMIN_HELP_MERGE;
    return `Mode fusion actif: sélectionne la table à fusionner avec ${getUnitDisplayCodeById(quickMergeSourceId)}.`;
  };
  const setQuickMergeMode = (enabled) => {
    quickMergeMode = Boolean(enabled);
    if (!quickMergeMode) quickMergeSourceId = '';
    if (mergeModeButton) {
      mergeModeButton.textContent = `Mode fusion: ${quickMergeMode ? 'ON' : 'OFF'}`;
      mergeModeButton.classList.toggle('is-active', quickMergeMode);
    }
  };

  const showLogin = () => {
    authBox.hidden = false;
    dashboard.hidden = true;
  };

  const showDashboard = () => {
    authBox.hidden = true;
    dashboard.hidden = false;
  };

  const setActionFeedback = (message, type = 'ok') => {
    if (!actionFeedback) return;
    actionFeedback.textContent = message;
    actionFeedback.classList.remove('is-error');
    if (type === 'error') actionFeedback.classList.add('is-error');
  };

  const closeMergeMenu = () => {
    mergeMenu.hidden = true;
    mergeMenuSourceId = '';
    if (mergeMenuList) mergeMenuList.innerHTML = '';
  };

  const openMergeMenu = (unitId, clientX, clientY) => {
    if (!mergeMenuList) return;
    const sourceUnit = getUnitById(unitId);
    const sourceMembers = sourceUnit ? sourceUnit.members : getMembersFromUnitId(unitId);
    if (!sourceMembers.length) return;
    const units = getTableUnits();
    const mergeTargets = units.filter(
      (unit) => !unit.members.some((memberId) => sourceMembers.includes(memberId))
    );

    const mergeButtons = mergeTargets.length
      ? mergeTargets
          .map((unit) => {
            return `<button type="button" data-merge-target="${unit.id}">Fusionner avec ${unit.displayCode} (${unit.seats})</button>`;
          })
          .join('')
      : '<p>Aucune table disponible pour fusionner.</p>';

    const splitButton =
      sourceMembers.length > 1
        ? `<button type="button" data-merge-split="1">Dissocier ${sourceUnit?.displayCode || getUnitDisplayCodeById(unitId)}</button>`
        : '';

    mergeMenuList.innerHTML = `
      <p class="admin-merge-menu__title">${sourceUnit?.displayCode || getUnitDisplayCodeById(unitId)}</p>
      ${mergeButtons}
      ${splitButton}
      <button type="button" data-merge-close="1">Fermer</button>
    `;

    mergeMenuSourceId = unitId;
    mergeMenu.hidden = false;

    const viewportPadding = 12;
    const rect = mergeMenu.getBoundingClientRect();
    const left = clamp(clientX, viewportPadding, window.innerWidth - rect.width - viewportPadding);
    const top = clamp(clientY, viewportPadding, window.innerHeight - rect.height - viewportPadding);
    mergeMenu.style.left = `${left}px`;
    mergeMenu.style.top = `${top}px`;
  };

  const getReservationRangeText = (reservation) => {
    const start = toMinutes(reservation.time);
    const end = start + 120;
    return `${fromMinutes(start)} - ${fromMinutes(end)}`;
  };

  const getReservationAt = (tableId, dateISO, atTime) => {
    const point = toMinutes(atTime);
    const reservations = readReservations()
      .filter((item) => {
        if (item.date !== dateISO) return false;
        const members = getReservationMembers(item);
        return members.includes(tableId);
      })
      .sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

    return reservations.find((reservation) => {
      const start = toMinutes(reservation.time);
      const end = start + 120;
      return point >= start && point < end;
    });
  };

  const getManualBlockAt = (tableId, dateISO, atTime) => {
    const point = toMinutes(atTime);
    const blocks = readAdminBlocks()
      .filter((item) => item.date === dateISO && item.tableId === tableId)
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    return blocks.find((block) => {
      const start = toMinutes(block.startTime);
      const rawEnd =
        Number.isFinite(Number(block.endMinutes)) && Number(block.endMinutes) > 0
          ? Number(block.endMinutes)
          : toMinutes(block.endTime);
      const [, end] = normalizeRange(start, rawEnd);
      return point >= start && point < end;
    });
  };

  const getTableStatusAt = (tableId, dateISO, atTime) => {
    const reservation = getReservationAt(tableId, dateISO, atTime);
    if (reservation) return { type: 'reserved', item: reservation };
    const block = getManualBlockAt(tableId, dateISO, atTime);
    if (block) return { type: 'blocked', item: block };
    return { type: 'free', item: null };
  };

  const getUnitStatusAt = (unit, dateISO, atTime) => {
    let blocked = null;
    for (const memberId of unit.members) {
      const status = getTableStatusAt(memberId, dateISO, atTime);
      if (status.type === 'reserved') return status;
      if (status.type === 'blocked' && !blocked) blocked = status;
    }
    if (blocked) return blocked;
    return { type: 'free', item: null };
  };

  const toggleManualOccupationForMembers = (memberIds, atTime) => {
    const normalizedMembers = [...memberIds].filter((id) => Boolean(TABLE_BY_ID[id]));
    if (!normalizedMembers.length) return;
    const selectedDate = dateInput.value || toISODate(new Date());
    const blockStart = toMinutes(atTime);
    const blockEnd = blockStart + 120;
    const unitCode =
      normalizedMembers.length > 1
        ? getUnitDisplayCodeById(`GROUP:${normalizedMembers.slice().sort().join('+')}`)
        : getTableCode(normalizedMembers[0]);
    const overlappingReservation = readReservations().find((reservation) => {
      if (reservation.date !== selectedDate) return false;
      const reservationMembers = getReservationMembers(reservation);
      if (!reservationMembers.some((memberId) => normalizedMembers.includes(memberId))) return false;
      const start = toMinutes(reservation.time);
      const end = start + 120;
      return overlaps(blockStart, blockEnd, start, end);
    });

    if (overlappingReservation) {
      setActionFeedback(
        `${unitCode} a déjà une réservation sur ce créneau (${overlappingReservation.name} - ${overlappingReservation.time}).`,
        'error'
      );
      return;
    }

    const existingBlocks = normalizedMembers
      .map((memberId) => getManualBlockAt(memberId, selectedDate, atTime))
      .filter(Boolean);

    if (existingBlocks.length === normalizedMembers.length) {
      existingBlocks.forEach((block) => removeAdminBlock(block.id));
      setActionFeedback(`${unitCode} repasse en disponible à ${atTime}.`);
      renderAdmin();
      return;
    }

    const endMinutes = toMinutes(atTime) + 120;
    const endTime = fromMinutes(endMinutes);
    normalizedMembers.forEach((memberId) => {
      if (getManualBlockAt(memberId, selectedDate, atTime)) return;
      addAdminBlock({
        id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tableId: memberId,
        date: selectedDate,
        startTime: atTime,
        endMinutes,
        endTime,
        reason: 'Arrivée sans réservation',
        createdAt: new Date().toISOString(),
      });
    });
    setActionFeedback(`${unitCode} marquée indisponible de ${atTime} à ${endTime}.`);
    renderAdmin();
  };

  const toggleManualOccupationByUnit = (unitId, atTime) => {
    const unit = getUnitById(unitId);
    const members = unit ? unit.members : getMembersFromUnitId(unitId);
    toggleManualOccupationForMembers(members, atTime);
  };

  const handleAdminTableClick = (unitId) => {
    const activeUnit = getUnitById(unitId);
    const activeCode = activeUnit?.displayCode || getUnitDisplayCodeById(unitId);
    if (!quickMergeMode) {
      toggleManualOccupationByUnit(unitId, selectedTime);
      return;
    }

    if (!quickMergeSourceId) {
      quickMergeSourceId = unitId;
      setActionFeedback(`Source de fusion sélectionnée: ${activeCode}.`);
      renderAdmin();
      return;
    }

    if (quickMergeSourceId === unitId) {
      quickMergeSourceId = '';
      setActionFeedback('Sélection de fusion annulée.');
      renderAdmin();
      return;
    }

    const sourceMembers = getMembersFromUnitId(quickMergeSourceId);
    const targetMembers = getMembersFromUnitId(unitId);
    if (sourceMembers.some((memberId) => targetMembers.includes(memberId))) {
      setActionFeedback(`${activeCode} est déjà dans ce groupe.`, 'error');
      return;
    }

    const mergedGroup = mergeUnitsById(quickMergeSourceId, unitId);
    if (!mergedGroup) {
      setActionFeedback('Fusion impossible sur cette sélection.', 'error');
      return;
    }

    alignMergedGroupLayout(mergedGroup, sourceMembers[0]);
    quickMergeSourceId = '';
    const totalSeats = mergedGroup.reduce((sum, id) => sum + (TABLE_BY_ID[id]?.seats || 0), 0);
    const mergedUnitId = `GROUP:${mergedGroup.join('+')}`;
    const mergedCode = getUnitDisplayCodeById(mergedUnitId);
    setActionFeedback(`Fusion créée: ${mergedCode} (${totalSeats}).`);
    renderAdmin();
  };

  const renderSlotStrip = (selectedDate) => {
    if (!slotStrip) return;
    const units = getTableUnits();
    slotStrip.innerHTML = EVENING_SLOTS.map((slot) => {
      const busyCount = units.filter((unit) => {
        const status = getUnitStatusAt(unit, selectedDate, slot);
        return status.type !== 'free';
      }).length;
      return `
        <button
          type="button"
          class="admin-slot-btn${slot === selectedTime ? ' is-selected' : ''}"
          data-admin-slot="${slot}"
        >
          <span>${slot}</span>
          <strong>${busyCount}</strong>
        </button>
      `;
    }).join('');
  };

  const renderTimeline = (selectedDate) => {
    if (!timeline) return;
    const units = getTableUnits();
    const header = EVENING_SLOTS.map(
      (slot) => `<div class="admin-timeline__head${slot === selectedTime ? ' is-selected' : ''}">${slot}</div>`
    ).join('');

    const rows = units.map((unit) => {
      const cells = EVENING_SLOTS.map((slot) => {
        const status = getUnitStatusAt(unit, selectedDate, slot);
        const isSelected = slot === selectedTime;
        const cellLabel =
          status.type === 'reserved'
            ? `R`
            : status.type === 'blocked'
              ? `I`
              : 'L';
        const title =
          status.type === 'reserved'
            ? `${unit.displayCode} ${slot}: réservée (${status.item.name})`
            : status.type === 'blocked'
              ? `${unit.displayCode} ${slot}: indisponible (${status.item.reason || 'Arrivée'})`
              : `${unit.displayCode} ${slot}: libre`;

        return `
          <button
            type="button"
            class="admin-timeline__cell is-${status.type}${isSelected ? ' is-selected' : ''}"
            data-admin-timeline-cell="1"
            data-admin-unit-id="${unit.id}"
            data-admin-slot-time="${slot}"
            title="${escapeHTML(title)}"
            ${status.type === 'reserved' ? 'disabled' : ''}
          >
            ${cellLabel}
          </button>
        `;
      }).join('');

      return `
        <div class="admin-timeline__row">
          <div class="admin-timeline__label">${unit.displayCode}</div>
          <div class="admin-timeline__cells">${cells}</div>
        </div>
      `;
    }).join('');

    timeline.innerHTML = `
      <div class="admin-timeline__row admin-timeline__row--head">
        <div class="admin-timeline__label">Tables</div>
        <div class="admin-timeline__heads">${header}</div>
      </div>
      ${rows}
    `;
  };

  const renderAdmin = () => {
    const selectedDate = dateInput.value || toISODate(new Date());
    const currentLayout = getTableLayout();
    const units = getTableUnits(currentLayout);
    if (!EVENING_SLOTS.includes(selectedTime)) {
      selectedTime = EVENING_SLOTS[0];
    }
    if (quickMergeSourceId && !units.some((unit) => unit.id === quickMergeSourceId)) {
      quickMergeSourceId = '';
    }
    const term = (searchInput.value || '').trim().toLowerCase();

    const filteredReservations = readReservations()
      .filter((item) => item.date === selectedDate)
      .filter((item) => {
        if (!term) return true;
        const combined = `${item.name || ''} ${item.email || ''} ${item.phone || ''} ${item.tableLabel || ''} ${item.tableId || ''}`;
        return combined.toLowerCase().includes(term);
      })
      .sort((a, b) => {
        const timeA = toMinutes(a.time);
        const timeB = toMinutes(b.time);
        if (timeA !== timeB) return timeA - timeB;
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      });
    const dayBlocks = readAdminBlocks().filter((item) => item.date === selectedDate);

    countLabel.textContent = `${filteredReservations.length} réservation${filteredReservations.length > 1 ? 's' : ''} • ${dayBlocks.length} indisponibilité${dayBlocks.length > 1 ? 's' : ''} • ${formatISODateLong(selectedDate)}`;

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
              <p><strong>Téléphone :</strong> ${escapeHTML(item.phone || 'Non renseigné')}</p>
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

    renderSlotStrip(selectedDate);
    tableTimeLabel.textContent = `État des tables le ${formatISODateLong(selectedDate)} à ${selectedTime}`;
    if (tableGrid) {
      tableGrid.classList.toggle('is-merge-mode', quickMergeMode);
    }

    const sourceMembers = quickMergeSourceId ? getMembersFromUnitId(quickMergeSourceId) : [];

    tableGrid.innerHTML = `${TABLE_FLOOR_DECORATIONS}${units.map((unit) => {
      const status = getUnitStatusAt(unit, selectedDate, selectedTime);
      const plan = unit.plan || { x: 10, y: 10, w: 12, h: 10, shape: 'rect' };
      const leftChairs = Math.max(1, Math.ceil(unit.seats / 2));
      const rightChairs = Math.max(1, Math.floor(unit.seats / 2));
      const mergeClass =
        quickMergeMode && quickMergeSourceId
          ? quickMergeSourceId === unit.id
            ? ' is-merge-source'
            : unit.members.some((memberId) => sourceMembers.includes(memberId))
              ? ''
              : ' is-merge-candidate'
          : '';
      const extraClass =
        status.type === 'reserved'
          ? ' is-busy'
          : status.type === 'blocked'
            ? ' is-manual'
            : ' is-free';

      return `
        <button
          type="button"
          class="table-seat table-seat--${plan.shape}${extraClass}${mergeClass}"
          data-admin-unit="${escapeHTML(unit.id)}"
          data-admin-table-status="${status.type}"
          style="--x:${plan.x}%;--y:${plan.y}%;--w:${plan.w}%;--h:${plan.h}%;--chairs-left:${leftChairs};--chairs-right:${rightChairs};"
        >
          <span class="table-seat__label">${escapeHTML(unit.displayCode)}</span>
          <span class="table-seat__capacity">${escapeHTML(String(unit.seats))}</span>
        </button>
      `;
    }).join('')}`;

    renderTimeline(selectedDate);
  };

  const initAdmin = () => {
    const todayISO = toISODate(new Date());
    dateInput.value = todayISO;
    setQuickMergeMode(false);
    setActionFeedback(getCurrentAdminHelp());

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
        setActionFeedback(getCurrentAdminHelp());
        renderAdmin();
      } else {
        feedback.textContent = 'Identifiants invalides.';
      }
    });
  }

  if (mergeModeButton) {
    mergeModeButton.addEventListener('click', () => {
      setQuickMergeMode(!quickMergeMode);
      setActionFeedback(getCurrentAdminHelp());
      renderAdmin();
    });
  }

  if (tableGrid) {
    let dragState = null;

    const updateDraggedButtonStyle = (button, plan) => {
      button.style.setProperty('--x', `${plan.x}%`);
      button.style.setProperty('--y', `${plan.y}%`);
      button.style.setProperty('--w', `${plan.w}%`);
      button.style.setProperty('--h', `${plan.h}%`);
    };

    const endDrag = () => {
      if (!dragState) return;
      const finishedState = dragState;
      dragState = null;
      if (finishedState.didMove) {
        writeTableLayout(finishedState.layout);
        setActionFeedback(`${getUnitDisplayCodeById(finishedState.unitId, finishedState.layout)} déplacée. Position enregistrée.`);
        renderAdmin();
      } else {
        handleAdminTableClick(finishedState.unitId);
      }
    };

    tableGrid.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest('[data-admin-unit]');
      if (!(button instanceof HTMLElement)) return;
      event.preventDefault();
      const unitId = button.getAttribute('data-admin-unit');
      if (!unitId) return;

      const layout = getTableLayout();
      const unit = getUnitById(unitId, layout);
      if (!unit || !unit.plan) return;
      const origins = {};
      unit.members.forEach((memberId) => {
        const plan = layout[memberId];
        if (!plan) return;
        origins[memberId] = { x: plan.x, y: plan.y };
      });

      dragState = {
        unitId,
        members: unit.members,
        button,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        didMove: false,
        origins,
        layout,
      };

      button.setPointerCapture(event.pointerId);
    });

    tableGrid.addEventListener('pointermove', (event) => {
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      const rect = tableGrid.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const deltaX = event.clientX - dragState.startClientX;
      const deltaY = event.clientY - dragState.startClientY;

      if (!dragState.didMove && Math.hypot(deltaX, deltaY) > 4) {
        dragState.didMove = true;
      }

      if (!dragState.didMove) return;

      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;

      dragState.members.forEach((memberId) => {
        const tablePlan = dragState.layout[memberId];
        const origin = dragState.origins[memberId];
        if (!tablePlan || !origin) return;
        const halfW = tablePlan.w / 2;
        const halfH = tablePlan.h / 2;
        tablePlan.x = clamp(origin.x + deltaXPercent, halfW + 1, 99 - halfW);
        tablePlan.y = clamp(origin.y + deltaYPercent, halfH + 1, 99 - halfH);
      });

      const previewUnit = buildTableUnitFromMembers(dragState.members, dragState.layout);
      if (previewUnit.plan) {
        updateDraggedButtonStyle(dragState.button, previewUnit.plan);
      }
    });

    tableGrid.addEventListener('pointerup', (event) => {
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      endDrag();
    });

    tableGrid.addEventListener('pointercancel', () => {
      if (!dragState) return;
      dragState = null;
      renderAdmin();
    });

    tableGrid.addEventListener('contextmenu', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest('[data-admin-unit]');
      if (!(button instanceof HTMLElement)) return;
      const unitId = button.getAttribute('data-admin-unit');
      if (!unitId) return;
      event.preventDefault();
      openMergeMenu(unitId, event.clientX, event.clientY);
    });
  }

  if (mergeMenuList) {
    mergeMenuList.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const mergeTarget = target.getAttribute('data-merge-target');
      if (mergeTarget && mergeMenuSourceId) {
        const sourceMembers = getMembersFromUnitId(mergeMenuSourceId);
        const mergedGroup = mergeUnitsById(mergeMenuSourceId, mergeTarget);
        if (mergedGroup) {
          alignMergedGroupLayout(mergedGroup, sourceMembers[0]);
          const seats = mergedGroup.reduce((sum, id) => sum + (TABLE_BY_ID[id]?.seats || 0), 0);
          const mergedCode = getUnitDisplayCodeById(`GROUP:${mergedGroup.join('+')}`);
          setActionFeedback(`Fusion créée: ${mergedCode} (${seats}).`);
        }
        quickMergeSourceId = '';
        closeMergeMenu();
        renderAdmin();
        return;
      }

      const shouldSplit = target.getAttribute('data-merge-split');
      if (shouldSplit && mergeMenuSourceId) {
        const sourceMembers = getMembersFromUnitId(mergeMenuSourceId);
        const sourceCode = getUnitDisplayCodeById(mergeMenuSourceId);
        if (splitGroupByMembers(sourceMembers)) {
          setActionFeedback(`${sourceCode} dissociée.`);
        }
        quickMergeSourceId = '';
        closeMergeMenu();
        renderAdmin();
        return;
      }

      if (target.getAttribute('data-merge-close')) {
        closeMergeMenu();
      }
    });
  }

  document.addEventListener('click', (event) => {
    if (mergeMenu.hidden) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (mergeMenu.contains(target)) return;
    closeMergeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !mergeMenu.hidden) {
      closeMergeMenu();
    }
  });

  if (slotStrip) {
    slotStrip.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest('[data-admin-slot]');
      if (!button) return;
      const slot = button.getAttribute('data-admin-slot');
      if (!slot) return;
      selectedTime = slot;
      renderAdmin();
    });
  }

  if (timeline) {
    timeline.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest('[data-admin-timeline-cell]');
      if (!button) return;
      const unitId = button.getAttribute('data-admin-unit-id');
      const slot = button.getAttribute('data-admin-slot-time');
      if (!unitId || !slot) return;
      selectedTime = slot;
      toggleManualOccupationByUnit(unitId, slot);
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEYS.adminSession);
      if (loginForm) loginForm.reset();
      if (feedback) feedback.textContent = '';
      setQuickMergeMode(false);
      setActionFeedback(getCurrentAdminHelp());
      closeMergeMenu();
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

  [dateInput, searchInput].forEach((field) => {
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
      selectedTime = EVENING_SLOTS.includes(roundCurrentTimeToHalfHour())
        ? roundCurrentTimeToHalfHour()
        : EVENING_SLOTS[0];
      renderAdmin();
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      dateInput.value = shiftISODate(dateInput.value, 1);
      renderAdmin();
    });
  }

  window.addEventListener('storage', (event) => {
    const key = event.key || '';
    const syncKeys = new Set([
      STORAGE_KEYS.tableLayout,
      STORAGE_KEYS.tableMerges,
      STORAGE_KEYS.reservations,
      STORAGE_KEYS.adminBlocks,
      STORAGE_KEYS.adminSession,
    ]);
    if (key && !syncKeys.has(key)) return;

    if (!isLoggedIn()) {
      closeMergeMenu();
      showLogin();
      return;
    }
    if (!dashboard.hidden) {
      renderAdmin();
    }
  });

  initAdmin();
}
