// Attribution automatique des tables.
//
// Le client ne choisit plus sa table : le serveur la désigne. Règles validées
// avec le gérant :
//   1. une seule table, la plus petite qui accueille le groupe ;
//   2. exception unique — un groupe de 3 ou 4 sans table de 4 libre reçoit
//      deux tables de 2 côte à côte ;
//   3. au-delà, ou si rien n'est libre, aucune table n'est attribuée et la
//      demande reste en attente pour que l'admin la place à la main.
//
// Le voisinage n'est JAMAIS codé en dur : les tables sont déplaçables par
// glisser-déposer dans l'admin, donc il est recalculé à chaque attribution à
// partir de pos_x / pos_y.

// Distance maximale entre les centres de deux tables pour les considérer
// accolables, en pourcentage du plan (les coordonnées vont de 0 à 100).
// Seule valeur à ajuster si le résultat ne colle pas à la salle réelle.
const ADJACENCY_MAX_DISTANCE = 14

// Au-delà de ce nombre de couverts, aucune attribution automatique.
const MAX_AUTO_ASSIGN_SEATS = 6

// Zones où l'attribution automatique a le droit de placer un groupe, par ordre
// de préférence. La terrasse en est volontairement exclue : elle ne se réserve
// pas en ligne. Pour la rouvrir un jour, ajouter 'terrasse' à cette liste.
const ZONE_PRIORITY = ['interieur']

const normalizeZone = (value) =>
  String(value || '').trim().toLowerCase() === 'terrasse' ? 'terrasse' : 'interieur'

const distanceBetween = (a, b) => Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y))

// Deux tables sont accolables si elles sont dans la même zone et assez proches.
const areAdjacent = (a, b) =>
  Boolean(a) &&
  Boolean(b) &&
  a.id !== b.id &&
  normalizeZone(a.zone) === normalizeZone(b.zone) &&
  distanceBetween(a, b) <= ADJACENCY_MAX_DISTANCE

// Trie par zone prioritaire, puis par places croissantes (la plus petite table
// qui convient), puis par identifiant pour un résultat stable.
const compareCandidates = (a, b) => {
  const zoneDelta = ZONE_PRIORITY.indexOf(normalizeZone(a.zone)) - ZONE_PRIORITY.indexOf(normalizeZone(b.zone))
  if (zoneDelta !== 0) return zoneDelta
  if (a.seats !== b.seats) return a.seats - b.seats
  return String(a.id).localeCompare(String(b.id))
}

/**
 * Choisit les tables à attribuer.
 *
 * @param {object}   params
 * @param {Array}    params.tables      toutes les tables actives (id, seats, zone, x, y)
 * @param {number}   params.people      nombre de couverts
 * @param {Function} params.isFree      (tableId) => booléen, table libre sur le créneau
 * @returns {{ members: string[], reason: string }} `members` vide = à placer par l'admin
 */
const allocateTables = ({ tables, people, isFree }) => {
  const count = Number(people)

  if (!Number.isInteger(count) || count < 1) {
    return { members: [], reason: 'invalid' }
  }

  if (count > MAX_AUTO_ASSIGN_SEATS) {
    return { members: [], reason: 'group_too_large' }
  }

  const available = (tables || [])
    .filter((table) => table && table.isActive !== false)
    .filter((table) => ZONE_PRIORITY.includes(normalizeZone(table.zone)))
    .filter((table) => isFree(table.id))
    .sort(compareCandidates)

  const fits = (table, max = Infinity) => Number(table.seats) >= count && Number(table.seats) <= max

  // 1. La plus petite table seule qui accueille le groupe, sans dépasser 4
  // places pour un groupe de 3 ou 4 : une table de 6 est gardée pour un grand
  // groupe tant qu'une paire de tables de 2 peut faire l'affaire.
  const singleCap = count === 3 || count === 4 ? 4 : Infinity
  const single = available.find((table) => fits(table, singleCap))
  if (single) {
    return { members: [single.id], reason: 'single' }
  }

  // 2. Exception : 3 ou 4 personnes, deux tables de 2 côte à côte.
  if (count === 3 || count === 4) {
    const twoSeaters = available.filter((table) => Number(table.seats) === 2)

    let best = null
    for (let i = 0; i < twoSeaters.length; i += 1) {
      for (let j = i + 1; j < twoSeaters.length; j += 1) {
        const a = twoSeaters[i]
        const b = twoSeaters[j]
        if (!areAdjacent(a, b)) continue

        const distance = distanceBetween(a, b)
        const zoneRank = ZONE_PRIORITY.indexOf(normalizeZone(a.zone))
        // La paire la plus serrée, en privilégiant l'intérieur.
        if (!best || zoneRank < best.zoneRank || (zoneRank === best.zoneRank && distance < best.distance)) {
          best = { pair: [a.id, b.id].sort(), distance, zoneRank }
        }
      }
    }

    if (best) {
      return { members: best.pair, reason: 'pair' }
    }

    // 3. Ni table de 4 ni paire : on accepte une table plus grande.
    const larger = available.find((table) => fits(table))
    if (larger) {
      return { members: [larger.id], reason: 'single_oversized' }
    }
  }

  // 4. Rien de libre : l'admin placera la demande.
  return { members: [], reason: 'no_table_available' }
}

module.exports = {
  ADJACENCY_MAX_DISTANCE,
  MAX_AUTO_ASSIGN_SEATS,
  allocateTables,
  areAdjacent
}
