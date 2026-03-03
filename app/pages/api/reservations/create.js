import supabaseAdmin from "@/lib/supabaseAdmin";
import { timesOverlap, isOpenDay, getSlotsForDate } from "@/lib/dateUtils";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end();
  }

  const { date, time_start, covers, table_id, name, email, phone, message } = req.body ?? {};

  // Validation des champs obligatoires
  if (!date || !time_start || !covers || !table_id || !name || !email || !phone) {
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  }

  // Validation de la date (pas dans le passé)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bookingDate = new Date(date);
  if (bookingDate < today) {
    return res.status(400).json({ error: "La date est dans le passé." });
  }

  // Validation jour ouvert
  if (!isOpenDay(bookingDate)) {
    return res.status(400).json({ error: "Le restaurant est fermé ce jour." });
  }

  // Validation créneau
  const validSlots = getSlotsForDate(bookingDate);
  if (!validSlots.includes(time_start)) {
    return res.status(400).json({ error: "Créneau invalide." });
  }

  // Validation email basique
  if (!email.includes("@")) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }

  // Vérification table
  const { data: table } = await supabaseAdmin
    .from("tables")
    .select("id, seats, is_active")
    .eq("id", table_id)
    .single();

  if (!table || !table.is_active) {
    return res.status(400).json({ error: "Table invalide." });
  }
  if (table.seats < Number(covers)) {
    return res.status(400).json({ error: "Table trop petite pour ce groupe." });
  }

  // Vérification conflits
  const { data: existing } = await supabaseAdmin
    .from("reservations")
    .select("id, table_ids, time_start, status")
    .eq("date", date)
    .in("status", ["pending", "confirmed"]);

  const hasConflict = (existing ?? []).some(
    (r) =>
      r.table_ids?.includes(table_id) &&
      timesOverlap(r.time_start.slice(0, 5), time_start)
  );

  if (hasConflict) {
    return res.status(409).json({ error: "Cette table est déjà réservée sur ce créneau." });
  }

  // Insertion
  const { data: resa, error } = await supabaseAdmin
    .from("reservations")
    .insert({
      date,
      time_start,
      covers: Number(covers),
      table_ids: [table_id],
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      message: message?.trim() || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: "Erreur lors de la création de la réservation." });
  }

  // TODO Phase 5 — envoyer emails (accusé client + notification gérant)

  return res.status(201).json(resa);
}
