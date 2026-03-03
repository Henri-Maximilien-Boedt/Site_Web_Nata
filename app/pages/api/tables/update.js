import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).end();
  }

  const { id, pos_x, pos_y, seats, code, is_active } = req.body;
  if (!id) return res.status(400).json({ error: "id requis" });

  const updates = {};
  if (pos_x  !== undefined) updates.pos_x     = pos_x;
  if (pos_y  !== undefined) updates.pos_y     = pos_y;
  if (seats  !== undefined) updates.seats     = seats;
  if (code   !== undefined) updates.code      = code;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabaseAdmin
    .from("tables")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
