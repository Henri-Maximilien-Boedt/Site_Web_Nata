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

const parseJSONSafe = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const stateNode = document.getElementById('nata-state');
const initialServerState = stateNode
  ? parseJSONSafe(stateNode.value || stateNode.textContent || '{}', null)
  : null;

const bookingApiNode = document.getElementById('nata-booking-api');
const adminApiNode = document.getElementById('nata-admin-api');

const BOOKING_API = bookingApiNode?.dataset?.url || '/reservation/api/reservations';
const ADMIN_API = {
  deleteReservation: adminApiNode?.dataset?.deleteReservation || '/admin/api/reservations',
  updateLayout: adminApiNode?.dataset?.updateLayout || '/admin/api/layout',
  updateMerges: adminApiNode?.dataset?.updateMerges || '/admin/api/merges',
  updateBlocks: adminApiNode?.dataset?.updateBlocks || '/admin/api/blocks',
};

const isAdminPage = () => Boolean(document.querySelector('[data-admin-page]'));

const requestJSON = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message || `Erreur HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
};

if (initialServerState && Array.isArray(initialServerState.tables)) {
  if (Array.isArray(initialServerState.reservations)) {
    localStorage.setItem(STORAGE_KEYS.reservations, JSON.stringify(initialServerState.reservations));
  }
  if (Array.isArray(initialServerState.adminBlocks)) {
    localStorage.setItem(STORAGE_KEYS.adminBlocks, JSON.stringify(initialServerState.adminBlocks));
  }
  if (Array.isArray(initialServerState.tableMerges)) {
    localStorage.setItem(STORAGE_KEYS.tableMerges, JSON.stringify(initialServerState.tableMerges));
  }
  if (initialServerState.tableLayout && typeof initialServerState.tableLayout === 'object') {
    localStorage.setItem(STORAGE_KEYS.tableLayout, JSON.stringify(initialServerState.tableLayout));
  }
}

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'Nata2026!',
};

const TABLES = [
  { id: 'T2-1', code: 'T-1', seats: 2, label: 'T-1', zone: 'interieur' },
  { id: 'T2-2', code: 'T-2', seats: 2, label: 'T-2', zone: 'interieur' },
  { id: 'T2-3', code: 'T-3', seats: 2, label: 'T-3', zone: 'interieur' },
  { id: 'T2-4', code: 'T-4', seats: 2, label: 'T-4', zone: 'interieur' },
  { id: 'T2-5', code: 'T-5', seats: 2, label: 'T-5', zone: 'interieur' },
  { id: 'T4-1', code: 'T-6', seats: 2, label: 'T-6', zone: 'interieur' },
  { id: 'T4-2', code: 'T-7', seats: 2, label: 'T-7', zone: 'interieur' },
  { id: 'T4-3', code: 'T-8', seats: 2, label: 'T-8', zone: 'interieur' },
  { id: 'T4-4', code: 'T-9', seats: 2, label: 'T-9', zone: 'interieur' },
  { id: 'T10-1', code: 'T-10', seats: 2, label: 'T-10', zone: 'interieur' },
  { id: 'T2-6', code: 'T-22', seats: 2, label: 'T-22', zone: 'interieur' },
  { id: 'T2-7', code: 'T-23', seats: 6, label: 'T-23', zone: 'interieur' },
  { id: 'T2-9', code: 'T-25', seats: 2, label: 'T-25', zone: 'interieur' },
  { id: 'T2-10', code: 'T-26', seats: 2, label: 'T-26', zone: 'interieur' },
  { id: 'T2-11', code: 'T-27', seats: 6, label: 'T-27', zone: 'interieur' },
  { id: 'TR2-1', code: 'T-11', seats: 2, label: 'T-11', zone: 'terrasse' },
  { id: 'TR2-2', code: 'T-12', seats: 2, label: 'T-12', zone: 'terrasse' },
  { id: 'TR2-3', code: 'T-13', seats: 2, label: 'T-13', zone: 'terrasse' },
  { id: 'TR2-4', code: 'T-14', seats: 2, label: 'T-14', zone: 'terrasse' },
  { id: 'TR2-5', code: 'T-15', seats: 2, label: 'T-15', zone: 'terrasse' },
  { id: 'TR2-6', code: 'T-16', seats: 2, label: 'T-16', zone: 'terrasse' },
  { id: 'TR4-1', code: 'T-17', seats: 4, label: 'T-17', zone: 'terrasse' },
  { id: 'TR4-2', code: 'T-18', seats: 4, label: 'T-18', zone: 'terrasse' },
  { id: 'TR4-3', code: 'T-19', seats: 4, label: 'T-19', zone: 'terrasse' },
  { id: 'TR4-4', code: 'T-20', seats: 4, label: 'T-20', zone: 'terrasse' },
  { id: 'TR6-1', code: 'T-21', seats: 6, label: 'T-21', zone: 'terrasse' },
];

const TABLE_PLAN = {
  'T2-1': { x: 28, y: 17, w: 11, h: 12, shape: 'rect' },
  'T2-2': { x: 38, y: 17, w: 11, h: 12, shape: 'rect' },
  'T2-3': { x: 48, y: 17, w: 11, h: 12, shape: 'rect' },
  'T2-4': { x: 58, y: 17, w: 11, h: 12, shape: 'rect' },
  'T2-5': { x: 68, y: 17, w: 11, h: 12, shape: 'rect' },
  'T4-1': { x: 18, y: 42, w: 11, h: 12, shape: 'rect' },
  'T4-2': { x: 44, y: 45, w: 11, h: 12, shape: 'rect' },
  'T4-3': { x: 54, y: 45, w: 11, h: 12, shape: 'rect' },
  'T4-4': { x: 80, y: 34, w: 11, h: 12, shape: 'rect' },
  'T10-1': { x: 80, y: 49, w: 11, h: 12, shape: 'rect' },
  'T2-6': { x: 40, y: 36, w: 11, h: 12, shape: 'rect' },
  'T2-7': { x: 55, y: 36, w: 11, h: 12, shape: 'rect' },
  'T2-9': { x: 40, y: 52, w: 11, h: 12, shape: 'rect' },
  'T2-10': { x: 50, y: 52, w: 11, h: 12, shape: 'rect' },
  'T2-11': { x: 55, y: 56, w: 11, h: 12, shape: 'rect' },
  'TR2-1': { x: 16, y: 22, w: 12, h: 12, shape: 'round' },
  'TR2-2': { x: 30, y: 22, w: 12, h: 12, shape: 'round' },
  'TR2-3': { x: 44, y: 22, w: 12, h: 12, shape: 'round' },
  'TR2-4': { x: 58, y: 22, w: 12, h: 12, shape: 'round' },
  'TR2-5': { x: 72, y: 22, w: 12, h: 12, shape: 'round' },
  'TR2-6': { x: 86, y: 22, w: 12, h: 12, shape: 'round' },
  'TR4-1': { x: 24, y: 48, w: 14, h: 14, shape: 'round' },
  'TR4-2': { x: 44, y: 48, w: 14, h: 14, shape: 'round' },
  'TR4-3': { x: 64, y: 48, w: 14, h: 14, shape: 'round' },
  'TR4-4': { x: 84, y: 48, w: 14, h: 14, shape: 'round' },
  'TR6-1': { x: 54, y: 76, w: 17, h: 17, shape: 'round' },
};

const TABLE_BY_ID = Object.fromEntries(TABLES.map((table) => [table.id, table]));
const ZONE_LABELS = {
  interieur: 'Intérieur',
  terrasse: 'Terrasse',
};
const TABLE_ZONES = ['interieur', 'terrasse'];

const normalizeZone = (value) =>
  TABLE_ZONES.includes(String(value || '').trim().toLowerCase())
    ? String(value || '').trim().toLowerCase()
    : 'interieur';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const TABLE_SIZE_SCALE = 0.7;
const BASE_RECT_TABLE_WIDTH = 11 * TABLE_SIZE_SCALE;
const BASE_RECT_TABLE_HEIGHT = clamp((8 + 2 * 1.6) * TABLE_SIZE_SCALE, 12 * TABLE_SIZE_SCALE, 30 * TABLE_SIZE_SCALE);
const WIDE_INTERIOR_TABLE_IDS = new Set(['T2-7', 'T2-11']);
const getTableCode = (tableId) => TABLE_BY_ID[tableId]?.code || tableId;
const getTableRectSize = (table) => {
  const seats = Number(table?.seats || 0);
  if (WIDE_INTERIOR_TABLE_IDS.has(table?.id)) {
    return {
      w: BASE_RECT_TABLE_WIDTH * 1.8,
      h: BASE_RECT_TABLE_HEIGHT,
    };
  }
  return {
    w: BASE_RECT_TABLE_WIDTH,
    h: clamp((8 + seats * 1.6) * TABLE_SIZE_SCALE, 12 * TABLE_SIZE_SCALE, 30 * TABLE_SIZE_SCALE),
  };
};
const getTableRoundSize = (seats) => {
  const diameter = clamp((8 + seats * 1.7) * TABLE_SIZE_SCALE, 11 * TABLE_SIZE_SCALE, 20 * TABLE_SIZE_SCALE);
  return { w: diameter, h: diameter };
};

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
  if (isAdminPage()) {
    tableLayoutRevision += 1;
    void queueTableLayoutPersist(tableLayoutRevision);
  }
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
  if (isAdminPage()) void persistTableMerges();
};

let tableLayoutRevision = 0;
let tableLayoutPersistInFlight = false;
let tableLayoutPersistNeedsReplay = false;

const persistTableLayout = async (requestedRevision = tableLayoutRevision) => {
  try {
    const snapshot = readTableLayout();
    const payload = await requestJSON(ADMIN_API.updateLayout, {
      method: 'PUT',
      body: JSON.stringify({ layout: snapshot }),
    });
    if (payload?.tableLayout && typeof payload.tableLayout === 'object' && requestedRevision === tableLayoutRevision) {
      localStorage.setItem(STORAGE_KEYS.tableLayout, JSON.stringify(payload.tableLayout));
    }
  } catch (error) {
    console.error('Erreur sync layout:', error.message);
  }
};

const queueTableLayoutPersist = async (requestedRevision = tableLayoutRevision) => {
  if (tableLayoutPersistInFlight) {
    tableLayoutPersistNeedsReplay = true;
    return;
  }

  tableLayoutPersistInFlight = true;
  let revisionToSync = requestedRevision;
  try {
    while (true) {
      tableLayoutPersistNeedsReplay = false;
      await persistTableLayout(revisionToSync);
      if (!tableLayoutPersistNeedsReplay && tableLayoutRevision <= revisionToSync) break;
      revisionToSync = tableLayoutRevision;
    }
  } finally {
    tableLayoutPersistInFlight = false;
  }
};

const persistTableMerges = async () => {
  try {
    const payload = await requestJSON(ADMIN_API.updateMerges, {
      method: 'PUT',
      body: JSON.stringify({ tableMerges: readTableMerges() }),
    });
    if (Array.isArray(payload?.tableMerges)) {
      localStorage.setItem(STORAGE_KEYS.tableMerges, JSON.stringify(payload.tableMerges));
    }
  } catch (error) {
    console.error('Erreur sync fusions:', error.message);
  }
};

const normalizeMergeGroups = (groups) => {
  const validGroups = groups
    .filter((group) => Array.isArray(group))
    .flatMap((group) => {
      const deduped = Array.from(
        new Set(
          group
            .map((id) => String(id || '').trim())
            .filter((id) => id && TABLE_BY_ID[id])
        )
      );
      const byZone = deduped.reduce(
        (acc, id) => {
          const zone = normalizeZone(TABLE_BY_ID[id]?.zone);
          acc[zone].push(id);
          return acc;
        },
        { interieur: [], terrasse: [] }
      );
      return [byZone.interieur, byZone.terrasse];
    })
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
    const base = TABLE_PLAN[table.id] || {
      x: 10,
      y: 10,
      w: 12,
      h: 10,
      shape: table.zone === 'terrasse' ? 'round' : 'rect',
    };
    const custom = saved[table.id] && typeof saved[table.id] === 'object' ? saved[table.id] : {};
    const shape = base.shape === 'round' ? 'round' : 'rect';
    const size = shape === 'round' ? getTableRoundSize(table.seats) : getTableRectSize(table);
    const x = Number(custom.x ?? base.x);
    const y = Number(custom.y ?? base.y);
    layout[table.id] = {
      x: clamp(Number.isFinite(x) ? x : base.x, 3, 97),
      y: clamp(Number.isFinite(y) ? y : base.y, 3, 97),
      w: size.w,
      h: size.h,
      shape,
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

const getZoneFromMembers = (members) => {
  const firstMember = Array.isArray(members) && members.length ? TABLE_BY_ID[members[0]] : null;
  return normalizeZone(firstMember?.zone || 'interieur');
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

const getTableUnitsByZone = (zone, layout = getTableLayout()) => {
  const targetZone = normalizeZone(zone);
  return getTableUnits(layout).filter((unit) => getZoneFromMembers(unit.members) === targetZone);
};

const getUnitById = (unitId, layout = getTableLayout()) =>
  getTableUnits(layout).find((unit) => unit.id === unitId);

const getGroupForMember = (memberId, groups = normalizeMergeGroups(readTableMerges())) =>
  groups.find((group) => group.includes(memberId)) || null;

const mergeTablesById = (sourceId, targetId) => {
  if (!TABLE_BY_ID[sourceId] || !TABLE_BY_ID[targetId] || sourceId === targetId) return null;
  if (normalizeZone(TABLE_BY_ID[sourceId].zone) !== normalizeZone(TABLE_BY_ID[targetId].zone)) {
    return null;
  }
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
  // Place merged tables side by side (horizontal grow), keeping each table's width/height.
  if (!Array.isArray(group) || group.length < 2) return;
  const layout = getTableLayout();
  const anchor = layout[anchorId] || layout[group[0]];
  if (!anchor) return;

  const ordered = [anchorId, ...group.filter((id) => id !== anchorId)];
  const totalWidth = ordered.reduce((sum, tableId) => {
    const item = layout[tableId];
    return sum + (item ? item.w : 0);
  }, 0);
  if (!totalWidth) return;

  let cursor = anchor.x - totalWidth / 2;
  ordered.forEach((tableId) => {
    const item = layout[tableId];
    if (!item) return;
    const halfW = item.w / 2;
    const halfH = item.h / 2;
    item.x = clamp(cursor + item.w / 2, halfW + 1, 99 - halfW);
    item.y = clamp(anchor.y, halfH + 1, 99 - halfH);
    cursor += item.w;
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

const DAY_LABEL_SHORT_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const SERVICE_LABELS = {
  lunch: 'Midi',
  evening: 'Soir',
};

const toPeopleCount = (value) => {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const getServiceTypeFromTime = (timeValue) => (toMinutes(timeValue) < 17 * 60 ? 'lunch' : 'evening');

const getOpeningServicesForDay = (day) => {
  if (day === 0) return [];
  if (day === 1) return ['evening'];
  return ['lunch', 'evening'];
};

const getWeekStartISO = (iso) => {
  const date = fromISODate(iso);
  if (!date) return toISODate(new Date());
  const deltaToMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - deltaToMonday);
  return toISODate(date);
};

const formatISODateCompact = (iso) => {
  const date = fromISODate(iso);
  if (!date) return iso;
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;
};

const buildOpenServiceSlotsForWeek = (iso) => {
  const weekStartISO = getWeekStartISO(iso);
  const slots = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const currentISO = shiftISODate(weekStartISO, offset);
    const currentDate = fromISODate(currentISO);
    if (!currentDate) continue;
    const day = currentDate.getDay();
    const services = getOpeningServicesForDay(day);
    services.forEach((service) => {
      slots.push({
        dateISO: currentISO,
        service,
        dayLabel: DAY_LABEL_SHORT_FR[day] || '',
        dateLabel: formatISODateCompact(currentISO),
        serviceLabel: SERVICE_LABELS[service] || service,
      });
    });
  }

  return {
    weekStartISO,
    slots,
  };
};

const SERVICE_SLOT_RANGES = {
  lunch: { start: 12 * 60, end: 14 * 60 + 30 },
  evening: { start: 18 * 60, end: 22 * 60 },
};

const buildSlotsFromRange = (startMinutes, endMinutes) => {
  const slots = [];
  for (let value = startMinutes; value <= endMinutes; value += 30) {
    slots.push(fromMinutes(value));
  }
  return slots;
};

const getSlotsForService = (service) => {
  const range = SERVICE_SLOT_RANGES[service];
  if (!range) return [];
  return buildSlotsFromRange(range.start, range.end);
};

const getAdminSlotsForDate = (isoDate) => {
  const date = fromISODate(isoDate || toISODate(new Date()));
  const day = date ? date.getDay() : new Date().getDay();
  const services = getOpeningServicesForDay(day);
  return services.flatMap((service) => getSlotsForService(service));
};

const getAdminSlotsByServiceForDate = (isoDate) => {
  const date = fromISODate(isoDate || toISODate(new Date()));
  const day = date ? date.getDay() : new Date().getDay();
  const services = getOpeningServicesForDay(day);
  return services.map((service) => ({
    service,
    label: SERVICE_LABELS[service] || service,
    slots: getSlotsForService(service),
  }));
};

const getDefaultAdminSlotForDate = (isoDate) => {
  const slots = getAdminSlotsForDate(isoDate);
  if (!slots.length) return '18:00';
  const rounded = roundCurrentTimeToHalfHour();
  if (slots.includes(rounded)) return rounded;
  return slots[0];
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
  <span class="table-floor__divider-main" aria-hidden="true"></span>
  <span class="table-floor__divider-leg" aria-hidden="true"></span>
  <div class="table-floor__entrance" aria-hidden="true">
    <span class="table-floor__entrance-label">ENTREE</span>
    <span class="table-floor__entrance-arrow">↓</span>
  </div>
`;

const TABLE_TERRACE_DECORATIONS = `
  <div class="table-terrace__edge table-terrace__edge--top" aria-hidden="true"></div>
  <div class="table-terrace__bar-label" aria-hidden="true">BAR</div>
`;

if (year) {
  year.textContent = new Date().getFullYear();
}

if (menuBtn && nav) {
  const setMenuState = (isOpen) => {
    nav.classList.toggle('open', isOpen);
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('nav-open', isOpen);
  };

  const closeMenu = () => setMenuState(false);

  menuBtn.addEventListener('click', () => {
    const isOpen = nav.classList.contains('open');
    setMenuState(!isOpen);
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', (event) => {
    if (!nav.classList.contains('open')) return;
    if (nav.contains(event.target) || menuBtn.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) closeMenu();
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
  // Keep reveals working on very tall mobile sections (e.g. drinks list in one column).
  { threshold: 0.01 }
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

const initImageLightbox = () => {
  if (!document.body || document.querySelector('.image-lightbox')) return;

  const modal = document.createElement('div');
  modal.className = 'image-lightbox';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="image-lightbox__backdrop" data-image-lightbox-close></div>
    <div class="image-lightbox__dialog" role="dialog" aria-modal="true" aria-label="Image agrandie">
      <button type="button" class="image-lightbox__close" data-image-lightbox-close>Fermer</button>
      <img class="image-lightbox__img" alt="" />
    </div>
  `;
  document.body.appendChild(modal);

  const modalImage = modal.querySelector('.image-lightbox__img');
  let lastFocusedElement = null;

  const isEligibleImage = (img) => {
    if (!(img instanceof HTMLImageElement)) return false;
    if (img.closest('.image-lightbox')) return false;
    if (img.closest('[data-no-lightbox]')) return false;
    if (!img.currentSrc && !img.src) return false;
    return true;
  };

  const refreshTargets = () => {
    document.querySelectorAll('img').forEach((img) => {
      if (isEligibleImage(img)) {
        img.classList.add('image-lightbox-trigger');
      } else {
        img.classList.remove('image-lightbox-trigger');
      }
    });
  };

  const closeLightbox = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('image-lightbox-open');
    modalImage.removeAttribute('src');
    modalImage.removeAttribute('srcset');
    modalImage.alt = '';
    if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
  };

  const openLightbox = (img) => {
    if (!isEligibleImage(img)) return;
    const source = img.currentSrc || img.src;
    if (!source) return;

    lastFocusedElement = document.activeElement;
    modalImage.src = source;
    modalImage.alt = img.alt || 'Image agrandie';
    modal.hidden = false;
    document.body.classList.add('image-lightbox-open');
  };

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const clickedImage = target.closest('img');
    if (!clickedImage || !isEligibleImage(clickedImage)) return;
    event.preventDefault();
    event.stopPropagation();
    openLightbox(clickedImage);
  });

  modal.querySelectorAll('[data-image-lightbox-close]').forEach((el) => {
    el.addEventListener('click', closeLightbox);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeLightbox();
  });

  if (window.MutationObserver) {
    const observer = new MutationObserver(() => refreshTargets());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  refreshTargets();
};

initImageLightbox();

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

  const describedItems = document.querySelectorAll('.menu-card h3, .drinks-block h3');
  if (!describedItems.length) return;

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

  describedItems.forEach((item) => {
    const itemName = item.textContent.trim();
    const description = menuDescriptionEntries[normalizeMenuKey(itemName)];
    if (!description) return;
    if (item.querySelector('.menu-info-btn')) return;

    item.classList.add('menu-item-with-info', 'menu-title-clickable');
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');

    const label = document.createElement('span');
    label.className = 'menu-item-label';
    label.textContent = itemName;

    const infoButton = document.createElement('button');
    infoButton.type = 'button';
    infoButton.className = 'menu-info-btn';
    infoButton.title = `Voir la description de ${itemName}`;
    infoButton.setAttribute('aria-label', `Voir la description de ${itemName}`);
    infoButton.textContent = 'i';
    infoButton.addEventListener('click', () => openModal(itemName, description));
    item.addEventListener('click', () => openModal(itemName, description));
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal(itemName, description);
      }
    });

    item.textContent = '';
    item.append(label, infoButton);
  });

  modal.querySelectorAll('[data-desc-close]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });
};

initMenuDescriptions();

const readReservationsRaw = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.reservations);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readReservations = (options = {}) => {
  const includeCancelled = Boolean(options.includeCancelled);
  const all = readReservationsRaw();
  if (includeCancelled) return all;
  return all.filter((item) => item.status !== 'cancelled');
};

const writeReservations = (reservations) => {
  localStorage.setItem(STORAGE_KEYS.reservations, JSON.stringify(reservations));
};

const addReservation = (payload) => {
  const reservations = readReservations();
  reservations.unshift(payload);
  writeReservations(reservations);
};

const createReservationOnServer = async (payload) => {
  const data = await requestJSON(BOOKING_API, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data?.reservation || null;
};

const deleteReservationOnServer = async (id) => {
  if (!isAdminPage()) return;
  await requestJSON(`${ADMIN_API.deleteReservation}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
};

const removeReservation = async (id) => {
  await deleteReservationOnServer(id);
  const reservations = readReservationsRaw().filter((item) => item.id !== id);
  writeReservations(reservations);
};

const updateReservationStatusRemote = async (id, status) => {
  const payload = await requestJSON(`/admin/api/reservations/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  const updated = payload?.reservation;
  const existing = readReservationsRaw();
  const next = existing.map((item) => (item.id === updated.id ? { ...item, ...updated } : item));
  if (!next.some((item) => item.id === updated.id)) {
    next.unshift(updated);
  }
  writeReservations(next);
  return updated;
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
  adminBlocksRevision += 1;
  localStorage.setItem(STORAGE_KEYS.adminBlocks, JSON.stringify(blocks));
  if (isAdminPage()) void queueAdminBlocksPersist(adminBlocksRevision);
};

let adminBlocksRevision = 0;
let adminBlocksPersistInFlight = false;
let adminBlocksPersistNeedsReplay = false;

const persistAdminBlocks = async (requestedRevision = adminBlocksRevision) => {
  const snapshot = readAdminBlocks();
  try {
    const payload = await requestJSON(ADMIN_API.updateBlocks, {
      method: 'PUT',
      body: JSON.stringify({ adminBlocks: snapshot }),
    });
    if (Array.isArray(payload?.adminBlocks) && requestedRevision === adminBlocksRevision) {
      localStorage.setItem(STORAGE_KEYS.adminBlocks, JSON.stringify(payload.adminBlocks));
    }
  } catch (error) {
    console.error('Erreur sync indisponibilités:', error.message);
  }
};

const queueAdminBlocksPersist = async (requestedRevision = adminBlocksRevision) => {
  if (adminBlocksPersistInFlight) {
    adminBlocksPersistNeedsReplay = true;
    return;
  }

  adminBlocksPersistInFlight = true;
  let revisionToSync = requestedRevision;

  try {
    while (true) {
      adminBlocksPersistNeedsReplay = false;
      await persistAdminBlocks(revisionToSync);
      if (!adminBlocksPersistNeedsReplay && adminBlocksRevision <= revisionToSync) break;
      revisionToSync = adminBlocksRevision;
    }
  } finally {
    adminBlocksPersistInFlight = false;
  }
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
  const targetEnd = targetStart + 90;

  const hasReservationOverlap = readReservations().some((reservation) => {
    if (ignoreReservationId && reservation.id === ignoreReservationId) return false;
    if (reservation.date !== dateISO) return false;
    const members = getReservationMembers(reservation);
    if (!members.includes(tableId)) return false;
    const start = toMinutes(reservation.time);
    const end = start + 90;
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

    let tableZoneHidden = form.querySelector('[data-table-zone]');
    if (!tableZoneHidden) {
      tableZoneHidden = document.createElement('input');
      tableZoneHidden.type = 'hidden';
      tableZoneHidden.name = 'tableZone';
      tableZoneHidden.value = 'interieur';
      tableZoneHidden.setAttribute('data-table-zone', '');
      form.appendChild(tableZoneHidden);
    }

    return {
      form,
      dateHidden: form.querySelector('[data-date-value]'),
      dateTrigger: form.querySelector('[data-date-trigger]'),
      timeHidden: form.querySelector('[data-time-value]'),
      timeTrigger: form.querySelector('[data-time-trigger]'),
      tableHidden: form.querySelector('[data-table-value]'),
      tableMembersHidden,
      tableZoneHidden,
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
      entry.tableZoneHidden &&
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
      <div class="table-zone-switch" data-table-zone-switch>
        <button type="button" class="is-active" data-table-zone="interieur">Intérieur</button>
        <button type="button" data-table-zone="terrasse">Terrasse</button>
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
  const tableZoneSwitch = tableModal.querySelector('[data-table-zone-switch]');

  let activeBooking = null;
  let visibleMonth = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  let selectedISO = '';
  let selectedTime = '';
  let activeTableZone = 'interieur';

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

  const syncTableZoneSwitch = () => {
    if (!tableZoneSwitch) return;
    const buttons = tableZoneSwitch.querySelectorAll('[data-table-zone]');
    buttons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      const zone = normalizeZone(button.getAttribute('data-table-zone'));
      button.classList.toggle('is-active', zone === activeTableZone);
    });
  };

  const setActiveTableZone = (zone, booking, resetSelection = true) => {
    activeTableZone = normalizeZone(zone);
    if (booking?.tableZoneHidden) {
      booking.tableZoneHidden.value = activeTableZone;
    }
    syncTableZoneSwitch();
    if (resetSelection && booking) resetTable(booking);
  };

  const resetTable = (booking) => {
    booking.tableHidden.value = '';
    booking.tableMembersHidden.value = '';
    booking.tableZoneHidden.value = activeTableZone;
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
    activeTableZone = 'interieur';
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
    setActiveTableZone(booking.tableZoneHidden.value || 'interieur', booking, false);
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
    const units = getTableUnitsByZone(activeTableZone);
    const activeZoneLabel = ZONE_LABELS[activeTableZone] || ZONE_LABELS.interieur;
    tableInfo.textContent = `Créneau: ${formatISODateLong(date)} à ${time} (1h30) - ${people} personne${people > 1 ? 's' : ''} - ${activeZoneLabel}`;
    tableLayout.classList.toggle('table-layout--terrace', activeTableZone === 'terrasse');
    const decorations = activeTableZone === 'terrasse' ? TABLE_TERRACE_DECORATIONS : TABLE_FLOOR_DECORATIONS;

    tableLayout.innerHTML = `${decorations}${units.map((unit) => {
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
    const zoneLabel = ZONE_LABELS[getZoneFromMembers(unit.members)] || ZONE_LABELS.interieur;
    activeBooking.tableZoneHidden.value = getZoneFromMembers(unit.members);
    activeBooking.tableTrigger.value = `${unit.label} (${unit.seats} pers.) - ${zoneLabel}`;
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
        const zone = getZoneFromMembers(selectedUnit.members);
        booking.tableZoneHidden.value = zone;
        booking.tableTrigger.value = `${selectedUnit.label} (${selectedUnit.seats} pers.) - ${ZONE_LABELS[zone] || ZONE_LABELS.interieur}`;
        booking.tableTrigger.classList.add('is-filled');
      } else if (fallbackTable) {
        booking.tableMembersHidden.value = fallbackTable.id;
        booking.tableZoneHidden.value = normalizeZone(fallbackTable.zone);
        booking.tableTrigger.value = `${fallbackTable.label} (${fallbackTable.seats} pers.) - ${ZONE_LABELS[normalizeZone(fallbackTable.zone)] || ZONE_LABELS.interieur}`;
        booking.tableTrigger.classList.add('is-filled');
      }
    } else {
      booking.tableZoneHidden.value = normalizeZone(booking.tableZoneHidden.value || 'interieur');
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

    booking.form.addEventListener('submit', async (event) => {
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

      try {
        const createdReservation = await createReservationOnServer({
          name,
          email,
          phone,
          people,
          date,
          time,
          tableId,
          tableMembers: selectedMembers,
          message,
        });

        if (!createdReservation) {
          throw new Error('Impossible de créer la réservation.');
        }

        addReservation(createdReservation);
        booking.form.reset();
        resetDateAndTime(booking);
        showFeedback(booking, 'Réservation envoyée. Nous te confirmons cela rapidement.');
      } catch (error) {
        showFeedback(
          booking,
          error?.message || 'La réservation a échoué. Merci de réessayer.',
          'error'
        );
      }
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

  if (tableZoneSwitch) {
    tableZoneSwitch.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest('[data-table-zone]');
      if (!(button instanceof HTMLButtonElement)) return;
      if (!activeBooking) return;
      const zone = normalizeZone(button.getAttribute('data-table-zone'));
      setActiveTableZone(zone, activeBooking);
      renderTablePlan(activeBooking);
    });
  }

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
        const zone = getZoneFromMembers(refreshedUnit.members);
        activeBooking.tableZoneHidden.value = zone;
        activeBooking.tableTrigger.value = `${refreshedUnit.label} (${refreshedUnit.seats} pers.) - ${ZONE_LABELS[zone] || ZONE_LABELS.interieur}`;
      }
    }

    renderTablePlan(activeBooking);
  });
}

const adminRoot = document.querySelector('[data-admin-page]');

if (adminRoot) {
  localStorage.setItem(STORAGE_KEYS.adminSession, '1');

  const loginForm = adminRoot.querySelector('[data-admin-login]');
  const authBox = adminRoot.querySelector('[data-admin-auth]');
  const dashboard = adminRoot.querySelector('[data-admin-dashboard]');
  const feedback = adminRoot.querySelector('[data-admin-feedback]');
  const countLabel = adminRoot.querySelector('[data-admin-count]');
  const list = adminRoot.querySelector('[data-admin-list]');
  const serviceSummary = adminRoot.querySelector('[data-admin-service-summary]');
  const tableTimeLabel = adminRoot.querySelector('[data-admin-table-time]');
  const tableGrid = adminRoot.querySelector('[data-admin-table-grid]');
  const adminZoneSwitch = adminRoot.querySelector('[data-admin-zone-switch]');
  const slotStrip = adminRoot.querySelector('[data-admin-slots]');
  const timeline = adminRoot.querySelector('[data-admin-timeline]');
  const actionFeedback = adminRoot.querySelector('[data-admin-action-feedback]');
  const mergeModeButton = adminRoot.querySelector('[data-admin-merge-mode]');
  const splitQuickButton = adminRoot.querySelector('[data-admin-split-quick-btn]');
  const splitQuickPanel = adminRoot.querySelector('[data-admin-split-quick]');
  const dateInput = adminRoot.querySelector('[data-admin-date]');
  const searchInput = adminRoot.querySelector('[data-admin-search]');
  const prevButton = adminRoot.querySelector('[data-admin-prev]');
  const todayButton = adminRoot.querySelector('[data-admin-today]');
  const nextButton = adminRoot.querySelector('[data-admin-next]');
  const logoutButton = adminRoot.querySelector('[data-admin-logout]');
  const ADMIN_HELP_DEFAULT =
    'Glisse une table pour la déplacer. Utilise le switch Intérieur/Terrasse. Active le mode fusion (ou clic droit) pour fusionner. Clic gauche sur une table libre pour la marquer indisponible (1h30).';
  const ADMIN_HELP_MERGE =
    'Mode fusion actif: clique une 1re table puis une 2e table pour les fusionner.';
  let selectedTime = getDefaultAdminSlotForDate(dateInput?.value || toISODate(new Date()));
  let activeAdminZone = 'interieur';
  let quickMergeMode = false;
  let quickMergeSourceId = '';
  let splitQuickOpen = false;
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
  const setActiveAdminZone = (zone) => {
    activeAdminZone = normalizeZone(zone);
    if (!adminZoneSwitch) return;
    const buttons = adminZoneSwitch.querySelectorAll('[data-admin-zone]');
    buttons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      const value = normalizeZone(button.getAttribute('data-admin-zone'));
      button.classList.toggle('is-active', value === activeAdminZone);
    });
  };
  const setSplitQuickOpen = (enabled) => {
    splitQuickOpen = Boolean(enabled);
    if (splitQuickButton) {
      splitQuickButton.classList.toggle('is-active', splitQuickOpen);
    }
    if (splitQuickPanel) {
      splitQuickPanel.hidden = !splitQuickOpen;
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
    const sourceZone = getZoneFromMembers(sourceMembers);
    const units = getTableUnitsByZone(sourceZone);
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
    const end = start + 90;
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
      const end = start + 90;
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
    const blockEnd = blockStart + 90;
    const unitCode =
      normalizedMembers.length > 1
        ? getUnitDisplayCodeById(`GROUP:${normalizedMembers.slice().sort().join('+')}`)
        : getTableCode(normalizedMembers[0]);
    const overlappingReservation = readReservations().find((reservation) => {
      if (reservation.date !== selectedDate) return false;
      const reservationMembers = getReservationMembers(reservation);
      if (!reservationMembers.some((memberId) => normalizedMembers.includes(memberId))) return false;
      const start = toMinutes(reservation.time);
      const end = start + 90;
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
    const currentBlocks = readAdminBlocks();

    if (existingBlocks.length === normalizedMembers.length) {
      const blockIds = new Set(existingBlocks.map((block) => block.id));
      writeAdminBlocks(currentBlocks.filter((block) => !blockIds.has(block.id)));
      setActionFeedback(`${unitCode} repasse en disponible à ${atTime}.`);
      renderAdmin();
      return;
    }

    const endMinutes = toMinutes(atTime) + 90;
    const endTime = fromMinutes(endMinutes);
    const nextBlocks = [...currentBlocks];
    normalizedMembers.forEach((memberId) => {
      if (getManualBlockAt(memberId, selectedDate, atTime)) return;
      nextBlocks.unshift({
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
    writeAdminBlocks(nextBlocks);
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
    const units = getTableUnitsByZone(activeAdminZone);
    const groups = getAdminSlotsByServiceForDate(selectedDate);
    if (!groups.length) {
      slotStrip.innerHTML = '<p class="admin-empty">Aucun service ce jour.</p>';
      return;
    }
    slotStrip.innerHTML = groups
      .map(({ service, label, slots }) => {
        if (!slots.length) return '';
        const buttons = slots
          .map((slot) => {
            const busyCount = units.filter((unit) => {
              const status = getUnitStatusAt(unit, selectedDate, slot);
              return status.type !== 'free';
            }).length;
            return `
              <button
                type="button"
                class="admin-slot-btn${slot === selectedTime ? ' is-selected' : ''}"
                data-admin-slot="${slot}"
                data-admin-service="${service}"
              >
                <span>${slot}</span>
                <strong>${busyCount}</strong>
              </button>
            `;
          })
          .join('');

        return `
          <div class="admin-slot-group">
            <p class="admin-slot-group__title">${escapeHTML(label)}</p>
            <div
              class="admin-slot-grid"
              data-service="${escapeHTML(service)}"
              style="--slot-count:${slots.length};"
            >${buttons}</div>
          </div>
        `;
      })
      .join('');
  };

  const renderTimeline = (selectedDate) => {
    if (!timeline) return;
    const units = getTableUnitsByZone(activeAdminZone);
    const slots = getAdminSlotsForDate(selectedDate);
    if (!slots.length) {
      timeline.innerHTML = '<p class="admin-empty">Aucun service ce jour.</p>';
      return;
    }
    const header = slots.map(
      (slot) => `<div class="admin-timeline__head${slot === selectedTime ? ' is-selected' : ''}">${slot}</div>`
    ).join('');

    const rows = units.map((unit) => {
      const cells = slots.map((slot) => {
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

  const renderServiceSummary = (selectedDate) => {
    if (!serviceSummary) return;
    const { weekStartISO, slots } = buildOpenServiceSlotsForWeek(selectedDate);
    const weekEndISO = shiftISODate(weekStartISO, 6);
    const reservations = readReservations();
    const selectedService = getServiceTypeFromTime(selectedTime);

    const cards = slots
      .map((slot) => {
        const covers = reservations
          .filter(
            (item) => item.date === slot.dateISO && getServiceTypeFromTime(item.time) === slot.service
          )
          .reduce((sum, item) => sum + toPeopleCount(item.people), 0);
        const selectedClass =
          slot.dateISO === selectedDate && slot.service === selectedService ? ' is-selected' : '';

        return `
          <article class="admin-service-card${selectedClass}">
            <p class="admin-service-card__label">${escapeHTML(
              `${slot.dayLabel} ${slot.dateLabel} • ${slot.serviceLabel}`
            )}</p>
            <p class="admin-service-card__covers">${covers}</p>
            <p class="admin-service-card__suffix">couverts</p>
          </article>
        `;
      })
      .join('');

    serviceSummary.innerHTML = `
      <div class="admin-service-summary__head">
        <p class="admin-service-summary__title">Couverts par service</p>
        <p class="admin-service-summary__meta">
          Semaine du ${escapeHTML(formatISODateCompact(weekStartISO))} au ${escapeHTML(formatISODateCompact(weekEndISO))}
        </p>
      </div>
      <div class="admin-service-summary__grid">${cards}</div>
    `;
  };

  const renderSplitQuickPanel = (units) => {
    if (!splitQuickPanel) return;
    if (!splitQuickOpen) {
      splitQuickPanel.hidden = true;
      return;
    }

    const mergedUnits = units.filter((unit) => unit.members.length > 1);
    splitQuickPanel.hidden = false;

    if (!mergedUnits.length) {
      splitQuickPanel.innerHTML = '<p class="admin-empty">Aucune table fusionnée actuellement.</p>';
      return;
    }

    splitQuickPanel.innerHTML = `
      <p class="admin-help">Défusion rapide (mobile): choisis une table fusionnée.</p>
      <div class="admin-split-quick__list">
        ${mergedUnits
          .map(
            (unit) => `
              <button
                type="button"
                class="btn btn-ghost"
                data-admin-split-unit="${escapeHTML(unit.id)}"
              >
                Dissocier ${escapeHTML(unit.displayCode)} (${escapeHTML(String(unit.seats))})
              </button>
            `
          )
          .join('')}
      </div>
    `;
  };

  const renderAdmin = () => {
    const selectedDate = dateInput.value || toISODate(new Date());
    const currentLayout = getTableLayout();
    const units = getTableUnitsByZone(activeAdminZone, currentLayout);
    const slotsForDate = getAdminSlotsForDate(selectedDate);
    if (!slotsForDate.includes(selectedTime)) {
      selectedTime = getDefaultAdminSlotForDate(selectedDate);
    }
    if (quickMergeSourceId && !units.some((unit) => unit.id === quickMergeSourceId)) {
      quickMergeSourceId = '';
    }
    const term = (searchInput.value || '').trim().toLowerCase();
    const reservations = readReservations({ includeCancelled: true });
    const dayReservations = reservations.filter((item) => item.date === selectedDate);
    const activeDayReservations = dayReservations.filter((item) => item.status !== 'cancelled');
    const filteredReservations = dayReservations
      .filter((item) => item.status === 'confirmed')
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
    const selectedDateCovers = activeDayReservations
      .reduce((sum, item) => sum + toPeopleCount(item.people), 0);

    countLabel.textContent = `${filteredReservations.length} réservation${filteredReservations.length > 1 ? 's' : ''} confirmée${filteredReservations.length > 1 ? 's' : ''} • ${selectedDateCovers} couvert${selectedDateCovers > 1 ? 's' : ''} • ${dayBlocks.length} indisponibilité${dayBlocks.length > 1 ? 's' : ''} • ${formatISODateLong(selectedDate)}`;

    if (!filteredReservations.length) {
      list.innerHTML = '<p class="admin-empty">Aucune réservation trouvée pour cette date.</p>';
    } else {
      list.innerHTML = filteredReservations
        .map(
          (item) => `
            <article class="reservation-card">
              <div class="reservation-card__head">
                <h4>${escapeHTML(item.name)}</h4>
              </div>
              <p class="reservation-card__status"><span class="badge badge--confirmed">Confirmée</span></p>
              <p><strong>Email :</strong> ${escapeHTML(item.email)}</p>
              <p><strong>Téléphone :</strong> ${escapeHTML(item.phone || 'Non renseigné')}</p>
              <p><strong>Date :</strong> ${escapeHTML(formatISODateLong(item.date))}</p>
              <p><strong>Horaire :</strong> ${escapeHTML(getReservationRangeText(item))}</p>
              <p><strong>Personnes :</strong> ${escapeHTML(item.people || '?')}</p>
              <p><strong>Table :</strong> ${escapeHTML(item.tableLabel || item.tableId || 'Non définie')}</p>
              <p><strong>Message :</strong> ${escapeHTML(item.message || 'Aucun message')}</p>
              <div class="reservation-card__actions">
                <button type="button" class="btn btn-ghost" data-reservation-reject="${escapeHTML(item.id)}">Annuler</button>
              </div>
            </article>
          `
        )
        .join('');
    }

    renderServiceSummary(selectedDate);
    renderSlotStrip(selectedDate);
    tableTimeLabel.textContent = `État des tables (${ZONE_LABELS[activeAdminZone] || ZONE_LABELS.interieur}) le ${formatISODateLong(selectedDate)} à ${selectedTime}`;
    if (tableGrid) {
      tableGrid.classList.toggle('is-merge-mode', quickMergeMode);
      tableGrid.classList.toggle('table-layout--terrace', activeAdminZone === 'terrasse');
    }

    const sourceMembers = quickMergeSourceId ? getMembersFromUnitId(quickMergeSourceId) : [];
    const decorations = activeAdminZone === 'terrasse' ? TABLE_TERRACE_DECORATIONS : TABLE_FLOOR_DECORATIONS;

    tableGrid.innerHTML = `${decorations}${units.map((unit) => {
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

    renderSplitQuickPanel(units);
    renderTimeline(selectedDate);
  };

  const initAdmin = () => {
    const todayISO = toISODate(new Date());
    dateInput.value = todayISO;
    setActiveAdminZone('interieur');
    setQuickMergeMode(false);
    setSplitQuickOpen(false);
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

  if (adminZoneSwitch) {
    adminZoneSwitch.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest('[data-admin-zone]');
      if (!(button instanceof HTMLButtonElement)) return;
      const zone = normalizeZone(button.getAttribute('data-admin-zone'));
      if (zone === activeAdminZone) return;
      setQuickMergeMode(false);
      quickMergeSourceId = '';
      closeMergeMenu();
      setSplitQuickOpen(false);
      setActiveAdminZone(zone);
      setActionFeedback(getCurrentAdminHelp());
      renderAdmin();
    });
  }

  if (splitQuickButton) {
    splitQuickButton.addEventListener('click', () => {
      setSplitQuickOpen(!splitQuickOpen);
      renderAdmin();
    });
  }

  if (splitQuickPanel) {
    splitQuickPanel.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest('[data-admin-split-unit]');
      if (!(button instanceof HTMLElement)) return;
      const unitId = button.getAttribute('data-admin-split-unit');
      if (!unitId) return;

      const members = getMembersFromUnitId(unitId);
      const sourceCode = getUnitDisplayCodeById(unitId);
      if (members.length < 2) {
        setActionFeedback('Cette table n\'est pas fusionnée.', 'error');
        return;
      }

      if (splitGroupByMembers(members)) {
        quickMergeSourceId = '';
        closeMergeMenu();
        setActionFeedback(`${sourceCode} dissociée.`);
        renderAdmin();
        return;
      }

      setActionFeedback('Dissociation impossible.', 'error');
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
      setSplitQuickOpen(false);
      setActionFeedback(getCurrentAdminHelp());
      closeMergeMenu();
      showLogin();
    });
  }

  if (list) {
    list.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const acceptId = target.getAttribute('data-reservation-accept');
      const rejectId = target.getAttribute('data-reservation-reject');

      if (acceptId) {
        try {
          await updateReservationStatusRemote(acceptId, 'confirmed');
          setActionFeedback('Réservation confirmée et email prêt à être envoyé.');
          renderAdmin();
        } catch (error) {
          setActionFeedback(error?.message || 'Confirmation impossible.', 'error');
        }
        return;
      }

      if (rejectId) {
        try {
          await updateReservationStatusRemote(rejectId, 'cancelled');
          setActionFeedback('Réservation annulée et email prêt à être envoyé.');
          renderAdmin();
        } catch (error) {
          setActionFeedback(error?.message || 'Annulation impossible.', 'error');
        }
        return;
      }

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
      selectedTime = getDefaultAdminSlotForDate(dateInput.value);
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
      setSplitQuickOpen(false);
      showLogin();
      return;
    }
    if (!dashboard.hidden) {
      renderAdmin();
    }
  });

  initAdmin();
}
