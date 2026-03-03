import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  /* GET — lecture publique ou admin */
  if (req.method === "GET") {
    const { admin, event } = req.query;

    let query = supabaseAdmin
      .from("news_posts")
      .select("*")
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (admin !== "true") query = query.eq("is_published", true);
    if (event === "true")  query = query.not("event_date", "is", null);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  /* POST — créer un article */
  if (req.method === "POST") {
    const { title, content, image_url, event_date, is_published } = req.body;
    if (!title) return res.status(400).json({ error: "title requis" });

    const { data, error } = await supabaseAdmin
      .from("news_posts")
      .insert({ title, content, image_url, event_date: event_date || null, is_published: is_published ?? false })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  /* PUT — modifier un article */
  if (req.method === "PUT") {
    const { id, ...fields } = req.body;
    if (!id) return res.status(400).json({ error: "id requis" });

    const { data, error } = await supabaseAdmin
      .from("news_posts")
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
    const { error } = await supabaseAdmin.from("news_posts").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  res.status(405).end();
}
