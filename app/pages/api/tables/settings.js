import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).end();
  }

  const { key, value } = req.body;
  if (!key || value === undefined) return res.status(400).json({ error: "key et value requis" });

  const { data, error } = await supabaseAdmin
    .from("settings")
    .upsert({ key, value: String(value) })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
