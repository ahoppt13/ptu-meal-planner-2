// PT:U AI Chef — serverless function
// Verifies the user is logged in (Supabase), then asks Claude to create
// a recipe from their ingredients (text and/or photo).
// Requires ANTHROPIC_API_KEY set in Netlify environment variables.

const SUPABASE_URL = "https://cmumymxdkwoyudkczunu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdW15bXhka3dveXVka2N6dW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1Mzk3MzgsImV4cCI6MjA5MzExNTczOH0.F_9AUausg4jMlW7TAmmX7rJQk-gdM2yRbOjAG36wCIc";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const { token, ingredients, image, imageType, targetCal, diet, allergens } = await req.json();

    // ── 1. Verify the user is genuinely logged in ──
    if (!token) return json({ error: "Please sign in to use the AI Chef." }, 401);
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!authRes.ok) return json({ error: "Please sign in to use the AI Chef." }, 401);

    if (!ingredients && !image) return json({ error: "Add some ingredients or a photo first." }, 400);
    if (image && image.length > 2_500_000) return json({ error: "Photo too large — please try again." }, 400);

    // ── 2. Build the prompt ──
    const allergenNote = allergens && allergens.length
      ? `CRITICAL: The user is allergic to: ${allergens.join(", ")}. The recipe MUST NOT contain these or any derivatives.`
      : "";
    const dietNote = diet && diet !== "no-restrictions" ? `The recipe must be suitable for a ${diet} diet.` : "";

    const instruction = `You are the PT:U recipe creator — a UK personal training brand focused on evidence-based, high-protein, practical meals using UK supermarket ingredients (grams/ml).
${image ? "First, identify the food ingredients visible in the photo. " : ""}Create ONE realistic recipe using STRICTLY ONLY the user's available ingredients${image ? " from the photo" : ""}${ingredients ? ` (they listed: ${ingredients})` : ""}, plus these basic staples if useful: olive oil, salt, black pepper, dried herbs and spices, garlic, and a squeeze of lemon or vinegar. Do NOT add ANY other ingredients — no extra proteins, vegetables, dairy, sauces, or carbs that the user did not list. If the listed ingredients are limited, keep the recipe simple rather than adding things. Prioritise protein. Aim for roughly ${targetCal || 500} kcal per portion.
${dietNote}
${allergenNote}
Respond with ONLY valid JSON, no markdown fences, in exactly this shape:
{"name":"...","description":"one appetising sentence","cal":0,"protein":0,"carbs":0,"fat":0,"fibre":0,"prepTime":0,"ingredients":[{"qty":"200g","item":"..."}],"steps":["...","..."],"identified":"comma-separated list of ingredients you identified/used"}
Macros are your best per-portion estimate as integers. prepTime in minutes.`;

    const content = [];
    if (image) content.push({ type: "image", source: { type: "base64", media_type: imageType || "image/jpeg", data: image } });
    content.push({ type: "text", text: instruction });

    // ── 3. Call Claude ──
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{ role: "user", content }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Anthropic API error:", aiRes.status, errText);
      return json({ error: "The AI Chef is busy — please try again in a moment." }, 502);
    }

    const data = await aiRes.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const recipe = JSON.parse(clean);
    return json({ recipe });
  } catch (e) {
    console.error("generate-recipe error:", e);
    return json({ error: "Something went wrong — please try again." }, 500);
  }
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
