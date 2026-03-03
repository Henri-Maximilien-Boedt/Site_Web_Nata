import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end();
  }

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "id requis" });

  const { data, error } = await supabaseAdmin
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // TODO Phase 5 — envoyer email annulation au client via sendEmail()

  return res.status(200).json(data);
}
