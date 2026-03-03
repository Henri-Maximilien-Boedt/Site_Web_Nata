import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  /* GET — lecture publique (is_available = true) */
  if (req.method === "GET") {
    const { admin } = req.query; // ?admin=true → tous les plats (admin uniquement)
    let query = supabaseAdmin
      .from("menu_items")
      .select("*")
      .order("category")
      .order("sort_order");

    if (admin !== "true") query = query.eq("is_available", true);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  /* POST — créer un plat */
  if (req.method === "POST") {
    const { name, category, subcategory, description, price, tags, sort_order } = req.body;
    if (!name || !category) return res.status(400).json({ error: "name et category requis" });

    const { data, error } = await supabaseAdmin
      .from("menu_items")
      .insert({ name, category, subcategory, description, price, tags: tags ?? [], sort_order: sort_order ?? 0 })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  /* PUT — modifier un plat */
  if (req.method === "PUT") {
    const { id, ...fields } = req.body;
    if (!id) return res.status(400).json({ error: "id requis" });

    const { data, error } = await supabaseAdmin
      .from("menu_items")
      .update(fields)
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
    const { error } = await supabaseAdmin.from("menu_items").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  res.status(405).end();
}
