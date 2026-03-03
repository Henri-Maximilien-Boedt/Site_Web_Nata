import supabaseAdmin from "@/lib/supabaseAdmin";
// import { sendEmail } from "@/lib/brevo"; // TODO Phase 5

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end();
  }

  const { type, event_date, guests, name, email, phone, message } = req.body;
  if (!name || !email) return res.status(400).json({ error: "name et email requis" });

  const { data, error } = await supabaseAdmin
    .from("quote_requests")
    .insert({ type, event_date: event_date || null, guests, name, email, phone, message })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // TODO Phase 5 — notifier le gérant par email

  return res.status(201).json(data);
}
