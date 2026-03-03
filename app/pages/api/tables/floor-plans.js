import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  /* GET — liste toutes les dispositions */
  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("floor_plans")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  /* POST — sauvegarder la disposition courante */
  if (req.method === "POST") {
    const { name, layout, is_default = false } = req.body;
    if (!name || !layout) return res.status(400).json({ error: "name et layout requis" });

    if (is_default) {
      await supabaseAdmin.from("floor_plans").update({ is_default: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    }

    const { data, error } = await supabaseAdmin
      .from("floor_plans")
      .insert({ name, layout, is_default })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  /* PUT — définir une disposition par défaut */
  if (req.method === "PUT") {
    const { id, is_default } = req.body;
    if (!id) return res.status(400).json({ error: "id requis" });

    if (is_default) {
      await supabaseAdmin.from("floor_plans").update({ is_default: false }).neq("id", id);
    }

    const { data, error } = await supabaseAdmin
      .from("floor_plans")
      .update({ is_default })
      .eq("id", id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  /* DELETE */
  if (req.method === "DELETE") {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "id requis" });
    const { error } = await supabaseAdmin.from("floor_plans").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  res.status(405).end();
}
