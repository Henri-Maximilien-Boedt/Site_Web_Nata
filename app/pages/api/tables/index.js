import supabaseAdmin from "@/lib/supabaseAdmin";
import { timesOverlap } from "@/lib/dateUtils";

export default async function handler(req, res) {
  /* ── POST — créer une table ───────────────────────────────── */
  if (req.method === "POST") {
    const { code, seats, zone } = req.body ?? {};
    if (!code || !seats || !zone) {
      return res.status(400).json({ error: "code, seats et zone sont obligatoires." });
    }
    if (!["interieur", "terrasse"].includes(zone)) {
      return res.status(400).json({ error: "zone doit être 'interieur' ou 'terrasse'." });
    }
    const { data, error } = await supabaseAdmin
      .from("tables")
      .insert({ code: code.trim(), seats: Number(seats), zone, pos_x: 50, pos_y: 50 })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  /* ── DELETE — supprimer une table ────────────────────────── */
  if (req.method === "DELETE") {
    const { id } = req.body ?? {};
    if (!id) return res.status(400).json({ error: "id obligatoire." });
    const { error } = await supabaseAdmin.from("tables").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  /* ── GET — liste des tables + terrasse + occupancy ───────── */
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).end();
  }

  const { date, time } = req.query;

  const [{ data: tables, error: tablesError }, { data: setting }] =
    await Promise.all([
      supabaseAdmin.from("tables").select("*").eq("is_active", true).order("code"),
      supabaseAdmin.from("settings").select("value").eq("key", "terrasse_active").single(),
    ]);

  if (tablesError) return res.status(500).json({ error: tablesError.message });

  // Calcul des tables occupées si date + time fournis (pour page réservation)
  let occupied_ids = [];
  if (date && time) {
    const { data: resas } = await supabaseAdmin
      .from("reservations")
      .select("table_ids, time_start, status")
      .eq("date", date)
      .in("status", ["pending", "confirmed"]);

    for (const r of resas ?? []) {
      if (r.table_ids && timesOverlap(r.time_start.slice(0, 5), time)) {
        occupied_ids.push(...r.table_ids);
      }
    }
  }

  return res.status(200).json({
    tables: tables ?? [],
    terrasse_active: setting?.value === "true",
    occupied_ids,
  });
}
