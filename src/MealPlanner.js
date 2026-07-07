import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "./supabase";
import { MEALS } from "./meals";

/*
  ╔══════════════════════════════════════════════════════════════════╗
  ║  PT:U MEAL PLANNER — Evidence-Based Nutrition Calculator        ║
  ║                                                                  ║
  ║  RESEARCH BASIS:                                                 ║
  ║  • DASH Diet (NCBI PMC10551663, PubMed 32330233, 25149893)     ║
  ║    — Fruits, vegetables, whole grains, lean proteins, low-fat   ║
  ║      dairy; reduced sodium. Shown to lower SBP by ~5-7 mmHg.   ║
  ║  • Low-GI Diet for T2D (PubMed 31374573, PMC3836142,           ║
  ║    PMC11519289) — Low-GI foods reduce HbA1c, fasting glucose,  ║
  ║    BMI, total cholesterol. NICE recommends high-fibre, low-GI   ║
  ║    carbs for T2D management.                                     ║
  ║  • High Cholesterol: DASH + Mediterranean patterns. Replacing   ║
  ║    saturated with unsaturated fats, soluble fibre from oats,    ║
  ║    legumes, nuts (PMC4751088, PubMed 25430608).                 ║
  ║  • Protein: 1.6-2.0g/kg/day per ISSN position stand;           ║
  ║    2.0g/kg for fat loss to preserve lean mass.                   ║
  ╚══════════════════════════════════════════════════════════════════╝
*/

// ─── COLOURS (PT:U Brand) ────────────────────────────────────────
const C = {
  green: "#8BC43F",
  black: "#000000",
  dark: "#353535",
  white: "#FFFFFF",
  greenLight: "#e8f5d3",
  greenDark: "#6fa030",
  grey: "#f4f4f4",
  greyMid: "#888",
  greyBorder: "#e0e0e0",
};

// Meal database lives in src/meals.js (543 meals from the 12 PT:U recipe books)

function calcBMR(age, gender, weight, height, unit) {
  let w = weight, h = height;
  if (unit === "imperial") { w = weight * 0.453592; h = height * 2.54; }
  if (gender === "male") return 10 * w + 6.25 * h - 5 * age + 5;
  return 10 * w + 6.25 * h - 5 * age - 161;
}
function calcTDEE(bmr, activity) {
  const m = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  return Math.round(bmr * (m[activity] || 1.2));
}
function goalCalories(tdee, goal) {
  if (goal === "fat_loss") return Math.round(tdee * 0.8);
  if (goal === "muscle_gain") return Math.round(tdee * 1.15);
  return tdee;
}
function calcProteinTarget(weight, unit, goal) {
  let w = unit === "imperial" ? weight * 0.453592 : weight;
  // Fat loss = 2.0g/kg, otherwise 1.6-2.0g/kg (aim 1.8g)
  const mult = goal === "fat_loss" ? 2.0 : 1.8;
  return Math.round(w * mult);
}

// ─── PORTION SCALING HELPERS ─────────────────────────────────────
// Parses a qty string like "200g", "1/2", "3 cloves", "1 tbsp" and scales it
function scaleQty(qtyStr, multiplier) {
  if (multiplier === 1) return qtyStr;
  // Match leading number (int, decimal, or fraction)
  const match = qtyStr.match(/^(\d+\/\d+|\d+\.?\d*)\s*(.*)/);
  if (!match) return qtyStr; // e.g. "pinch", "sprig" — don't scale
  let numStr = match[1];
  const unit = match[2];
  let num;
  if (numStr.includes("/")) {
    const [a, b] = numStr.split("/").map(Number);
    num = a / b;
  } else {
    num = parseFloat(numStr);
  }
  const scaled = num * multiplier;
  // Format nicely
  const nice = scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1).replace(/\.0$/, "");
  return `${nice}${unit ? (unit.startsWith("g") || unit.startsWith("m") ? "" : " ") + unit : ""}`;
}

// Scales a meal's macros, calories, and ingredient quantities by a multiplier
function scaleMeal(meal, multiplier) {
  if (!meal) return null;
  const m = Math.max(0.5, Math.min(2.5, multiplier)); // clamp between 0.5x and 2.5x
  return {
    ...meal,
    cal: Math.round(meal.cal * m),
    protein: Math.round(meal.protein * m),
    carbs: Math.round(meal.carbs * m),
    fat: Math.round(meal.fat * m),
    fibre: meal.fibre != null ? Math.round(meal.fibre * m) : undefined,
    portionScale: m,
    ingredients: meal.ingredients.map(ing => ({
      ...ing,
      qty: scaleQty(ing.qty, m),
      qtyOriginal: ing.qty,
    })),
  };
}

// ─── MEAL PLAN GENERATOR ─────────────────────────────────────────
function generateMealPlan(targetCal, proteinTarget, mealsPerDay, diet, allergens, conditions, hiddenNames = []) {
  const needsLowSodium = conditions.includes("high_bp");
  const needsLowGI = conditions.includes("type2_diabetes");
  const needsLowSatFat = conditions.includes("high_chol");
  const needsHighFibre = conditions.includes("type2_diabetes") || conditions.includes("high_chol");

  const filterMeals = (meals) => {
    return meals.filter(m => mealMatchesPrefs(m, diet, allergens, conditions, hiddenNames)).sort((a, b) => {
      if (needsHighFibre) {
        const aF = a.health.includes("high_fibre") ? 1 : 0;
        const bF = b.health.includes("high_fibre") ? 1 : 0;
        if (bF !== aF) return bF - aF;
      }
      const perMeal = proteinTarget / mealsPerDay;
      return Math.abs(a.protein - perMeal) - Math.abs(b.protein - perMeal);
    });
  };

  const bfOpts = filterMeals(MEALS.breakfast);
  const luOpts = filterMeals(MEALS.lunch);
  const diOpts = filterMeals(MEALS.dinner);
  const snOpts = filterMeals(MEALS.snack);

  let healthNotes = [];
  if (needsLowSodium) healthNotes.push("DASH Diet principles applied: low sodium, rich in potassium/magnesium (NCBI PMC10551663). Reduce added salt in all recipes.");
  if (needsLowGI) healthNotes.push("Low-GI foods prioritised: whole grains, legumes, non-starchy veg. Shown to reduce HbA1c (PubMed 31374573, PMC11519289).");
  if (needsLowSatFat) healthNotes.push("Low saturated fat focus: lean proteins, olive oil, oats, legumes. Soluble fibre helps lower LDL cholesterol (PubMed 25430608).");

  // Calorie distribution across meals
  const calSplit = mealsPerDay === 4
    ? { bf: 0.25, lu: 0.30, di: 0.30, sn: 0.15 }
    : { bf: 0.30, lu: 0.35, di: 0.35, sn: 0 };

  const isKeto = diet === "keto";
  const KETO_NET_CARB_CAP = 50; // grams net carbs per day; under 20g is fine (stricter keto)
  const netCarbsOf = (m) => (m ? Math.max(0, m.carbs - (m.fibre || 0)) : 0);

  const plan = [];
  const usedMeals = { breakfast: [], lunch: [], dinner: [], snack: [] };

  const bfTarget = Math.round(targetCal * calSplit.bf);
  const luTarget = Math.round(targetCal * calSplit.lu);
  const diTarget = Math.round(targetCal * calSplit.di);
  const snTarget = mealsPerDay === 4 ? Math.round(targetCal * calSplit.sn) : 0;

  for (let day = 0; day < 5; day++) {
    // Builds one candidate day WITHOUT committing picks to usedMeals,
    // so retries don't burn through the variety pool.
    // bias: null | "lowCarb" (keto) | "highProtein" (protein shortfall)
    const buildDay = (bias) => {
      const tentativeUsed = [];
      const pick = (arr, slotCalTarget, slotKey) => {
        if (arr.length === 0) return null;
        // Prefer meals not yet used this week for variety
        let candidates = arr.filter(m => !usedMeals[slotKey].includes(m.name) && !tentativeUsed.includes(m.name));
        if (candidates.length === 0) candidates = arr;
        // Closest base calories = least extreme portion scaling
        candidates = [...candidates].sort((a, b) => Math.abs(a.cal - slotCalTarget) - Math.abs(b.cal - slotCalTarget));
        let topN = candidates.slice(0, Math.min(bias ? 8 : 3, candidates.length));
        if (bias === "lowCarb") topN = [...topN].sort((a, b) => netCarbsOf(a) / a.cal - netCarbsOf(b) / b.cal).slice(0, 3);
        if (bias === "highProtein") topN = [...topN].sort((a, b) => b.protein / b.cal - a.protein / a.cal).slice(0, 3);
        const chosen = topN[Math.floor(Math.random() * topN.length)];
        tentativeUsed.push(chosen.name);
        return scaleMeal(chosen, slotCalTarget / chosen.cal);
      };
      const meals = {};
      meals.breakfast = pick(bfOpts, bfTarget, "breakfast");
      meals.lunch = pick(luOpts, luTarget, "lunch");
      meals.dinner = pick(diOpts, diTarget, "dinner");
      if (mealsPerDay === 4) meals.snack = pick(snOpts, snTarget, "snack");
      return meals;
    };

    const dayProtein = (meals) => Object.values(meals).reduce((s, m) => s + (m ? m.protein : 0), 0);
    const dayNet = (meals) => Object.values(meals).reduce((s, m) => s + netCarbsOf(m), 0);

    let dayMeals = buildDay(isKeto ? "lowCarb" : null);
    if (isKeto) {
      // Enforce the daily net carb cap: retry with low-carb bias, keep the best day
      for (let i = 0; i < 8 && dayNet(dayMeals) > KETO_NET_CARB_CAP; i++) {
        const retry = buildDay("lowCarb");
        if (dayNet(retry) < dayNet(dayMeals)) dayMeals = retry;
      }
    } else if (dayProtein(dayMeals) < proteinTarget * 0.9) {
      // Protein shortfall: retry with protein-dense bias, keep the best day
      for (let i = 0; i < 8 && dayProtein(dayMeals) < proteinTarget * 0.9; i++) {
        const retry = buildDay("highProtein");
        if (dayProtein(retry) > dayProtein(dayMeals)) dayMeals = retry;
      }
    }

    // Commit this day's picks so later days avoid repeats
    Object.entries(dayMeals).forEach(([slotKey, m]) => { if (m) usedMeals[slotKey].push(m.name); });

    const sum = (fn) => Object.values(dayMeals).reduce((s, m) => s + (m ? fn(m) : 0), 0);
    plan.push({
      day: day + 1,
      meals: dayMeals,
      totalCal: sum(m => m.cal),
      totalProtein: sum(m => m.protein),
      totalCarbs: sum(m => m.carbs),
      totalFat: sum(m => m.fat),
      totalNetCarbs: sum(m => netCarbsOf(m)),
      healthNotes,
    });
  }
  return plan;
}

// ─── SHOPPING LIST BUILDER ───────────────────────────────────────
// Sums quantities properly (200g + 150g = 350g), multiplies by the
// number of people, and groups items into supermarket categories.
const SHOP_CATEGORIES = [
  { name: "Store Cupboard", keywords: ["canned","tinned","stock","puree","paste","sauce","soy","tamari","oil","vinegar","honey","maple","agave","syrup","whey","protein powder","seasoning","cumin","paprika","cayenne","turmeric","cinnamon","curry","chia","seed","nut","almond","peanut","tahini","coconut","raisin","crouton","salsa","mayo","dressing","sweetener","vanilla","bay leaf","taco","tikka","marinara","caper","olive","chickpea","lentil","black bean","flour","breadcrumb","ice","coffee","chilli flake","string cheese"] },
  { name: "Meat & Fish", keywords: ["chicken","beef","steak","turkey","salmon","cod","tuna","prawn","lamb","ham","sausage","mince","fish"] },
  { name: "Dairy & Eggs", keywords: ["yogurt","cheese","milk","cream","butter","egg","halloumi","crème","creme"] },
  { name: "Bakery & Grains", keywords: ["bread","bagel","wrap","oat","rice","quinoa","pasta","spaghetti","granola","sourdough","tortilla"] },
  { name: "Fruit & Veg", keywords: [] },
];

function categoriseItem(item) {
  const lower = item.toLowerCase();
  for (const cat of SHOP_CATEGORIES) {
    if (cat.keywords.some(k => lower.includes(k))) return cat.name;
  }
  return "Fruit & Veg";
}

// Parses "200g" / "1/2" / "2 tbsp" / "1 slice (50g)" → { num, unit }; null for "pinch" etc.
function parseQty(qtyStr) {
  const match = String(qtyStr).trim().match(/^(\d+\/\d+|\d+\.?\d*)\s*(.*)$/);
  if (!match) return null;
  let num;
  if (match[1].includes("/")) { const [a, b] = match[1].split("/").map(Number); num = a / b; }
  else num = parseFloat(match[1]);
  // Normalise unit: strip parentheticals and trailing plural "s"
  const unit = match[2].replace(/\(.*?\)/g, "").trim().toLowerCase().replace(/s$/, "");
  return { num, unit };
}

function formatAmount(n, unit) {
  if (unit === "g" || unit === "ml") {
    const whole = Math.round(n);
    if (whole >= 1000) return `${parseFloat((whole / 1000).toFixed(2))}${unit === "g" ? "kg" : "L"}`;
    return `${whole}${unit}`;
  }
  if (unit === "tbsp" || unit === "tsp") {
    const q = Math.round(n * 4) / 4; // cooking measures: quarter precision
    return `${q % 1 === 0 ? q : parseFloat(q.toFixed(2))} ${unit}`;
  }
  // Countable items (eggs, bagels, slices, cloves...): round UP — can't buy half an egg
  const whole = Math.ceil(n);
  if (!unit) return String(whole);
  const plural = whole > 1 && !unit.endsWith("s") ? "s" : "";
  return `${whole} ${unit}${plural}`;
}

function buildShoppingList(plan, people) {
  const items = {};
  plan.forEach(day => {
    Object.values(day.meals).forEach(meal => {
      if (!meal) return;
      meal.ingredients.forEach(ing => {
        if (!items[ing.item]) items[ing.item] = { sums: {}, asNeeded: false };
        const p = parseQty(ing.qty);
        if (p) items[ing.item].sums[p.unit] = (items[ing.item].sums[p.unit] || 0) + p.num;
        else items[ing.item].asNeeded = true; // "pinch", "sprig", "handful"
      });
    });
  });
  const list = Object.entries(items).map(([item, data]) => {
    const parts = Object.entries(data.sums).map(([unit, total]) => formatAmount(total * people, unit));
    if (data.asNeeded) parts.push("as needed");
    return { item, qty: parts.join(" + "), category: categoriseItem(item) };
  });
  const grouped = {};
  list.forEach(e => { (grouped[e.category] = grouped[e.category] || []).push(e); });
  const order = ["Meat & Fish", "Fruit & Veg", "Dairy & Eggs", "Bakery & Grains", "Store Cupboard"];
  return order
    .map(name => ({ category: name, items: (grouped[name] || []).sort((a, b) => a.item.localeCompare(b.item)) }))
    .filter(g => g.items.length > 0);
}

// ─── MEAL AVAILABILITY CHECK ─────────────────────────────────────
// Returns meal slots with ZERO matching meals so we can warn the user
// before generating, instead of crashing on an empty plan.
function mealMatchesPrefs(m, diet, allergens, conditions, hiddenNames) {
  const dietMatch = diet === "no-restrictions" || m.tags.includes(diet);
  const allergenFree = !m.allergens.some(a => allergens.includes(a));
  let healthOk = true;
  if (conditions.includes("high_bp") && !m.health.includes("low_sodium")) healthOk = false;
  if (conditions.includes("type2_diabetes") && !m.health.includes("low_gi")) healthOk = false;
  if (conditions.includes("high_chol") && !m.health.includes("low_sat_fat")) healthOk = false;
  return dietMatch && allergenFree && healthOk && !hiddenNames.includes(m.name);
}

function checkMealAvailability(diet, allergens, conditions, mealsPerDay, hiddenNames = []) {
  const count = (meals) => meals.filter(m => mealMatchesPrefs(m, diet, allergens, conditions, hiddenNames)).length;
  const empty = [];
  if (count(MEALS.breakfast) === 0) empty.push("breakfast");
  if (count(MEALS.lunch) === 0) empty.push("lunch");
  if (count(MEALS.dinner) === 0) empty.push("dinner");
  if (mealsPerDay === 4 && count(MEALS.snack) === 0) empty.push("snacks");
  return empty;
}

// ─── STEP INDICATOR ──────────────────────────────────────────────
const StepIndicator = ({ current, total }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 28, padding: "0 8px" }}>
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center" }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          background: i <= current ? C.green : "transparent",
          color: i <= current ? C.white : C.greyMid,
          border: i <= current ? `2px solid ${C.green}` : `2px solid ${C.greyBorder}`,
          fontSize: 12, fontWeight: 700, transition: "all 0.3s", fontFamily: "monospace"
        }}>
          {i < current ? "✓" : i + 1}
        </div>
        {i < total - 1 && <div style={{ width: 20, height: 2, background: i < current ? C.green : C.greyBorder, transition: "all 0.3s" }} />}
      </div>
    ))}
  </div>
);

// ─── MAIN APP ────────────────────────────────────────────────────
export default function MealPlanner({ user, guest, onExitGuest }) {
  const [step, setStep] = useState(user ? 1 : 0);
  const [form, setForm] = useState({
    name: user?.user_metadata?.name || "", email: user?.email || "", emailConfirm: user?.email || "", healthGoal: "",
    age: "", gender: "male", weight: "", height: "", unit: "metric",
    activity: "moderate", goal: "fat_loss", diet: "no-restrictions",
    mealsPerDay: 4, people: 1, allergens: [], conditions: [],
  });
  const [plan, setPlan] = useState(null);
  const [showRecipe, setShowRecipe] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [savedMeals, setSavedMeals] = useState([]);
  const [viewSaved, setViewSaved] = useState(false);
  const [viewHidden, setViewHidden] = useState(false);

  // Load preferences from Supabase on mount (only for logged-in users)
  useEffect(() => {
    if (!user) return;
    setStep(s => s === 0 ? 1 : s);
    (async () => {
      const { data } = await supabase.from("preferences").select("*").eq("user_id", user.id).single();
      if (data) {
        setForm(f => ({
          ...f,
          age: data.age || "",
          gender: data.gender || "male",
          weight: data.weight || "",
          height: data.height || "",
          unit: data.unit || "metric",
          activity: data.activity || "moderate",
          goal: data.goal || "fat_loss",
          healthGoal: data.health_goal || "",
          diet: data.diet || "no-restrictions",
          mealsPerDay: data.meals_per_day || 4,
          people: data.people || 1,
          allergens: data.allergens || [],
          conditions: data.conditions || [],
        }));
      }
    })();
  }, [user]);

  // Load saved meals
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("saved_meals").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (data) setSavedMeals(data);
    })();
  }, [user]);

  const toggleSaveMeal = async (meal) => {
    if (!user) return;
    const existing = savedMeals.find(m => m.meal_name === meal.name);
    if (existing) {
      await supabase.from("saved_meals").delete().eq("id", existing.id);
      setSavedMeals(s => s.filter(m => m.id !== existing.id));
    } else {
      const { data } = await supabase.from("saved_meals").insert({ user_id: user.id, meal_name: meal.name, meal_data: meal }).select().single();
      if (data) setSavedMeals(s => [data, ...s]);
    }
  };

  const isSaved = (mealName) => savedMeals.some(m => m.meal_name === mealName);

  const [hiddenMeals, setHiddenMeals] = useState([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("hidden_meals").select("*").eq("user_id", user.id);
      if (data) setHiddenMeals(data);
    })();
  }, [user]);

  const hideMeal = async (meal) => {
    if (!user) return;
    const { data } = await supabase.from("hidden_meals").insert({ user_id: user.id, meal_name: meal.name }).select().single();
    if (data) setHiddenMeals(h => [...h, data]);
  };

  const unhideMeal = async (id) => {
    if (!user) return;
    await supabase.from("hidden_meals").delete().eq("id", id);
    setHiddenMeals(h => h.filter(m => m.id !== id));
  };

  // Save preferences to Supabase
  const savePreferences = async () => {
    if (!user) return;
    try {
      await supabase.from("preferences").upsert({
        user_id: user.id,
        age: Number(form.age) || null,
        gender: form.gender,
        weight: Number(form.weight) || null,
        height: Number(form.height) || null,
        unit: form.unit,
        activity: form.activity,
        goal: form.goal,
        health_goal: form.healthGoal,
        diet: form.diet,
        meals_per_day: form.mealsPerDay,
        people: form.people,
        allergens: form.allergens,
        conditions: form.conditions,
        updated_at: new Date().toISOString(),
      });
    } catch (e) { console.error("Save preferences error:", e); }
  };

  const ALLERGENS = ["dairy","eggs","nuts","gluten","fish","shellfish","soy","sesame"];
  const CONDITIONS = [
    { id: "high_bp", label: "High Blood Pressure" },
    { id: "high_chol", label: "High Cholesterol" },
    { id: "type2_diabetes", label: "Type 2 Diabetes" },
    { id: "none", label: "None" },
  ];

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleAllergen = (a) => setForm(f => ({ ...f, allergens: f.allergens.includes(a) ? f.allergens.filter(x => x !== a) : [...f.allergens, a] }));
  const toggleCondition = (c) => setForm(f => ({
    ...f, conditions: c === "none" ? [] : f.conditions.includes(c) ? f.conditions.filter(x => x !== c) : [...f.conditions.filter(x => x !== "none"), c]
  }));

  const bmr = calcBMR(Number(form.age), form.gender, Number(form.weight), Number(form.height), form.unit);
  const tdee = calcTDEE(bmr, form.activity);
  const target = goalCalories(tdee, form.goal);
  // Keto uses classic macro split: 70-80% fat, 15-20% protein, 5-10% carbs
  const proteinTarget = form.diet === "keto"
    ? Math.round(target * 0.175 / 4)
    : calcProteinTarget(Number(form.weight), form.unit, form.goal);
  const saveLead = () => {
    try {
      const f = document.createElement("form");
      f.method = "POST";
      f.action = "https://script.google.com/macros/s/AKfycbxBa7zE3rzAbE3Gezt8-OIoifI1JTTZJqJ9fl-wxP9ELZPwMMFXUj71kL2uSdsFyTZ5/exec";
      f.target = "_blank_hidden";
      const addField = (n, v) => { const i = document.createElement("input"); i.type = "hidden"; i.name = n; i.value = v; f.appendChild(i); };
      addField("name", form.name);
      addField("email", form.email);
      addField("goal", form.healthGoal);
      const iframe = document.createElement("iframe");
      iframe.name = "_blank_hidden";
      iframe.style.display = "none";
      document.body.appendChild(iframe);
      document.body.appendChild(f);
      f.submit();
      setTimeout(() => { f.remove(); iframe.remove(); }, 3000);
    } catch(e) {}
  };

  const [emailSent, setEmailSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  const sendMealPlanEmail = () => {
    if (!plan || emailSending) return;
    setEmailSending(true);
    try {
      let mealHtml = "";
      plan.forEach(day => {
        mealHtml += "<h2>Day " + day.day + " (" + day.totalCal + " kcal | P: " + day.totalProtein + "g | C: " + day.totalCarbs + "g | F: " + day.totalFat + "g)</h2>";
        Object.entries(day.meals).forEach(([type, meal]) => {
        if (!meal) return;
          if (!meal) return;
          if (!meal) return;
          mealHtml += "<div style=\"margin:8px 0;padding:12px;background:#f8f8f8;border-radius:8px;border-left:4px solid #8BC43F;\">";
          mealHtml += "<strong>" + type.charAt(0).toUpperCase() + type.slice(1) + ":</strong> " + meal.name + "<br/>";
          mealHtml += "<span style=\"font-size:12px;color:#666;\">" + meal.cal + " kcal | P:" + meal.protein + "g | C:" + meal.carbs + "g | F:" + meal.fat + "g</span><br/>";
          mealHtml += "<span style=\"font-size:13px;\">" + meal.recipe + "</span><br/>";
          mealHtml += "<span style=\"font-size:12px;color:#555;\">Ingredients: " + meal.ingredients.map(i => i.qty + " " + i.item).join(", ") + "</span>";
          mealHtml += "</div>";
        });
      });
      let shopHtml = "<h2>Shopping List</h2><table style=\"width:100%;border-collapse:collapse;\">";
      shopHtml += "<tr><th style=\"text-align:left;padding:6px;background:#353535;color:#fff;\">Item</th><th style=\"text-align:left;padding:6px;background:#353535;color:#fff;\">Qty</th></tr>";
      shoppingList.forEach(group => {
        shopHtml += "<tr><td colspan=\"2\" style=\"padding:8px 6px;font-weight:700;background:#f4f4f4;\">" + group.category + "</td></tr>";
        group.items.forEach(s => { shopHtml += "<tr><td style=\"padding:6px;border-bottom:1px solid #eee;\">" + s.item + "</td><td style=\"padding:6px;border-bottom:1px solid #eee;\">" + s.qty + "</td></tr>"; });
      });
      shopHtml += "</table>";
      const f = document.createElement("form");
      f.method = "POST";
      f.action = "https://script.google.com/macros/s/AKfycbxBa7zE3rzAbE3Gezt8-OIoifI1JTTZJqJ9fl-wxP9ELZPwMMFXUj71kL2uSdsFyTZ5/exec";
      f.target = "_blank_hidden2";
      const addField = (n, v) => { const i = document.createElement("input"); i.type = "hidden"; i.name = n; i.value = v; f.appendChild(i); };
      addField("action", "sendEmail");
      addField("email", form.email);
      addField("name", form.name);
      addField("calories", String(target));
      addField("protein", String(proteinTarget));
      addField("goal", form.healthGoal);
      addField("mealHtml", mealHtml);
      addField("shopHtml", shopHtml);
      const iframe = document.createElement("iframe");
      iframe.name = "_blank_hidden2";
      iframe.style.display = "none";
      document.body.appendChild(iframe);
      document.body.appendChild(f);
      f.submit();
      setTimeout(() => { f.remove(); iframe.remove(); setEmailSent(true); setEmailSending(false); }, 3000);
    } catch(e) { setEmailSending(false); }
  };
  const [availabilityWarning, setAvailabilityWarning] = useState([]);

  const doGenerate = () => { savePreferences();
    const empty = checkMealAvailability(form.diet, form.allergens, form.conditions, form.mealsPerDay, hiddenMeals.map(h => h.meal_name));
    if (empty.length > 0) { setAvailabilityWarning(empty); return; }
    setAvailabilityWarning([]);
    setGenerating(true);
    setTimeout(() => {
      setPlan(generateMealPlan(target, proteinTarget, form.mealsPerDay, form.diet, form.allergens, form.conditions, hiddenMeals.map(h => h.meal_name)));
      setGenerating(false);
      setStep(6);
    }, 800);
  };

  const doRegenerate = () => {
    const empty = checkMealAvailability(form.diet, form.allergens, form.conditions, form.mealsPerDay, hiddenMeals.map(h => h.meal_name));
    if (empty.length > 0) { window.alert(`No ${empty.join(", ")} options match your filters (this can happen after hiding meals). Try unhiding some meals or adjusting your selections.`); return; }
    setGenerating(true);
    setTimeout(() => {
      setPlan(generateMealPlan(target, proteinTarget, form.mealsPerDay, form.diet, form.allergens, form.conditions, hiddenMeals.map(h => h.meal_name)));
      setGenerating(false);
      setStep(6);
    }, 800);
  };

  // Swap a single meal: replaces one slot with a different matching meal,
  // scaled to the same calorie target, and recomputes that day's totals
  const swapMeal = (dayNumber, slotKey) => {
    setPlan(prev => {
      if (!prev) return prev;
      const calSplit = form.mealsPerDay === 4
        ? { breakfast: 0.25, lunch: 0.30, dinner: 0.30, snack: 0.15 }
        : { breakfast: 0.30, lunch: 0.35, dinner: 0.35, snack: 0 };
      const slotTarget = Math.round(target * (calSplit[slotKey] || 0.3));
      const hiddenNames = hiddenMeals.map(h => h.meal_name);
      const inPlan = prev.flatMap(d => Object.values(d.meals)).filter(Boolean).map(m => m.name);
      let options = MEALS[slotKey].filter(m =>
        mealMatchesPrefs(m, form.diet, form.allergens, form.conditions, hiddenNames) && !inPlan.includes(m.name));
      if (options.length === 0) options = MEALS[slotKey].filter(m =>
        mealMatchesPrefs(m, form.diet, form.allergens, form.conditions, hiddenNames));
      if (options.length === 0) return prev;
      options.sort((a, b) => Math.abs(a.cal - slotTarget) - Math.abs(b.cal - slotTarget));
      const topN = options.slice(0, Math.min(5, options.length));
      const chosen = topN[Math.floor(Math.random() * topN.length)];
      const replacement = scaleMeal(chosen, slotTarget / chosen.cal);
      return prev.map(d => {
        if (d.day !== dayNumber) return d;
        const meals = { ...d.meals, [slotKey]: replacement };
        const sum = (fn) => Object.values(meals).reduce((s, m) => s + (m ? fn(m) : 0), 0);
        return { ...d, meals,
          totalCal: sum(m => m.cal), totalProtein: sum(m => m.protein),
          totalCarbs: sum(m => m.carbs), totalFat: sum(m => m.fat),
          totalNetCarbs: sum(m => Math.max(0, m.carbs - (m.fibre || 0))) };
      });
    });
  };

  // ── "What's in my fridge?" matcher ──
  const [fridgeOpen, setFridgeOpen] = useState(false);
  const [fridgeInput, setFridgeInput] = useState("");
  const [fridgeExpanded, setFridgeExpanded] = useState(null);

  const fridgeMatches = useMemo(() => {
    const terms = fridgeInput.toLowerCase().split(/[,\n]+/).map(t => t.trim()).filter(t => t.length >= 3);
    if (terms.length === 0) return [];
    const hiddenNames = hiddenMeals.map(h => h.meal_name);
    const seen = new Set();
    const results = [];
    ["breakfast", "lunch", "dinner", "snack"].forEach(slot => {
      MEALS[slot].forEach(m => {
        if (seen.has(m.name)) return;
        seen.add(m.name);
        if (!mealMatchesPrefs(m, form.diet, form.allergens, form.conditions, hiddenNames)) return;
        const have = [], missing = [];
        m.ingredients.forEach(ing => {
          const item = ing.item.toLowerCase();
          if (terms.some(t => item.includes(t) || t.includes(item))) have.push(ing.item);
          else missing.push(ing.item);
        });
        if (have.length > 0) results.push({ meal: m, slot, have, missing });
      });
    });
    results.sort((a, b) => (b.have.length - a.have.length) || (a.missing.length - b.missing.length));
    return results.slice(0, 20);
  }, [fridgeInput, form.diet, form.allergens, form.conditions, hiddenMeals]);

  // ── AI Chef (logged-in users): generate an original recipe from ingredients ──
  const [fridgeTab, setFridgeTab] = useState("match"); // "match" | "ai"
  const [aiInput, setAiInput] = useState("");
  const [aiImage, setAiImage] = useState(null); // { data, type, preview }
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecipe, setAiRecipe] = useState(null);
  const [aiError, setAiError] = useState("");

  const handleAiPhoto = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Resize to max 1024px to keep uploads fast and costs low
        const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setAiImage({ data: dataUrl.split(",")[1], type: "image/jpeg", preview: dataUrl });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const generateAiRecipe = async () => {
    if (aiLoading || (!aiInput.trim() && !aiImage)) return;
    setAiLoading(true); setAiError(""); setAiRecipe(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const calSplit = form.mealsPerDay === 4 ? 0.30 : 0.35;
      const res = await fetch("/.netlify/functions/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: session?.access_token,
          ingredients: aiInput.trim(),
          image: aiImage?.data,
          imageType: aiImage?.type,
          targetCal: Math.round(target * calSplit) || 500,
          diet: form.diet,
          allergens: form.allergens,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setAiError(data.error || "Something went wrong — please try again."); }
      else setAiRecipe(data.recipe);
    } catch (e) {
      setAiError("Couldn't reach the AI Chef — check your connection and try again.");
    }
    setAiLoading(false);
  };

  const shoppingList = plan ? buildShoppingList(plan, form.people) : [];
  const [checkedItems, setCheckedItems] = useState({});

  // Print / PDF
  const handlePrint = () => {
    const w = window.open('', '_blank');
    let h = `<html><head><title>PT:U Meal Plan - ${form.name}</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
      *{box-sizing:border-box;}body{font-family:'Inter',sans-serif;padding:40px;color:#353535;max-width:800px;margin:0 auto;}
      .logo{font-size:32px;font-weight:800;color:#000;}.logo span{color:#8BC43F;}
      h1{font-size:24px;border-bottom:3px solid #8BC43F;padding-bottom:10px;margin-top:24px;}
      h2{font-size:18px;margin-top:24px;color:#000;border-bottom:1px solid #e0e0e0;padding-bottom:6px;}
      .info{font-size:13px;color:#555;margin:4px 0;line-height:1.6;}
      .meal{margin:8px 0;padding:14px;background:#f8f8f8;border-radius:8px;border-left:4px solid #8BC43F;}
      .meal-name{font-weight:700;font-size:15px;}.macros{font-size:12px;color:#666;margin-top:3px;}
      .recipe{font-size:13px;color:#444;margin-top:6px;line-height:1.6;}
      .ingredients{font-size:12px;color:#555;margin-top:4px;}
      table{width:100%;border-collapse:collapse;margin-top:12px;}
      th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;}
      th{background:#353535;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:1px;}
      .health-note{background:#e8f5d3;padding:12px;border-radius:8px;font-size:12px;color:#353535;margin:12px 0;line-height:1.6;}
      .footer{margin-top:40px;font-size:10px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:12px;}
      @media print{body{padding:20px;}}
    </style></head><body>`;
    h += `<div class="logo">PT<span>:</span>U</div>`;
    h += `<h1>5-Day Personalised Meal Plan</h1>`;
    h += `<p class="info"><strong>Client:</strong> ${form.name} &nbsp;|&nbsp; <strong>Email:</strong> ${form.email}</p>`;
    h += `<p class="info"><strong>Goal:</strong> ${form.healthGoal} &nbsp;|&nbsp; <strong>Calorie Target:</strong> ${target} kcal/day &nbsp;|&nbsp; <strong>Protein Target:</strong> ${proteinTarget}g/day</p>`;
    h += `<p class="info"><strong>Diet:</strong> ${form.diet.replace(/-/g,' ')} &nbsp;|&nbsp; <strong>Servings:</strong> ${form.people} ${form.people === 1 ? 'person' : 'people'}</p>`;
    if (plan[0].healthNotes.length > 0) {
      h += `<div class="health-note"><strong>Evidence-Based Health Notes:</strong><br/>`;
      plan[0].healthNotes.forEach(n => { h += `• ${n}<br/>`; });
      h += `</div>`;
    }
    plan.forEach(day => {
      h += `<h2>Day ${day.day} <span style="font-weight:400;font-size:13px;color:#888;">(${day.totalCal} kcal | P: ${day.totalProtein}g | C: ${day.totalCarbs}g | F: ${day.totalFat}g — Target: ${target} kcal)</span></h2>`;
      Object.entries(day.meals).forEach(([type, meal]) => {
        if (!meal) return;
        if (!meal) return;
        const scaleNote = meal.portionScale && meal.portionScale !== 1
          ? ` <span style="color:#8BC43F;font-size:11px;">(portions adjusted to ${Math.round(meal.portionScale * 100)}%)</span>` : "";
        h += `<div class="meal"><div class="meal-name">${type.charAt(0).toUpperCase()+type.slice(1)}: ${meal.name}${scaleNote}</div>`;
        h += `<div class="macros">${meal.cal} kcal | P: ${meal.protein}g | C: ${meal.carbs}g | F: ${meal.fat}g</div>`;
        h += `<div class="recipe"><strong>Recipe:</strong> ${meal.recipe}</div>`;
        h += `<div class="ingredients"><strong>Ingredients (adjusted to your calories):</strong> ${meal.ingredients.map(i => `${i.qty} ${i.item}`).join(', ')}</div></div>`;
      });
    });
    h += `<h2>🛒 Shopping List (${form.people} ${form.people === 1 ? "person" : "people"})</h2>`;
    h += `<table><tr><th>Item</th><th>Total Quantity</th></tr>`;
    shoppingList.forEach(group => {
      h += `<tr><td colspan="2" style="font-weight:700;background:#f4f4f4;">${group.category}</td></tr>`;
      group.items.forEach(s => { h += `<tr><td>${s.item}</td><td>${s.qty}</td></tr>`; });
    });
    h += `</table>`;
    h += `<div style="text-align:center;margin-top:40px;padding-top:16px;border-top:2px solid #8BC43F;">`;
    h += `<div style="font-size:20px;font-weight:800;margin-bottom:8px;">PT<span style="color:#8BC43F">:</span>U Personal Training</div>`;
    h += `<div style="font-size:12px;color:#555;line-height:2;">`;
    h += `🌐 <a href="https://www.pt-u.co.uk" style="color:#8BC43F;">www.pt-u.co.uk</a><br/>`;
    h += `📸 <a href="https://www.instagram.com/ptupersonaltraininggym" style="color:#8BC43F;">@Ptupersonaltraininggym</a><br/>`;
    h += `📧 <a href="mailto:info@pt-u.co.uk" style="color:#8BC43F;">info@pt-u.co.uk</a><br/>`;
    h += `📞 07551 622273</div>`;
    h += `<div style="font-size:10px;color:#aaa;margin-top:12px;">Calorie estimates use the Mifflin-St Jeor equation. Health condition guidance based on peer-reviewed research (NCBI/PubMed).<br/>Always consult a healthcare professional for medical dietary needs.</div></div>`;
    h += `</body></html>`;
    w.document.write(h);
    w.document.close();
    w.print();
  };

  // ─── STYLES ──────────────────────────────────────────────────
  const S = {
    page: { minHeight: "100vh", background: C.white, fontFamily: "'Inter', system-ui, sans-serif", color: C.dark, padding: "12px" },
    card: { background: C.white, borderRadius: 14, padding: "24px 20px", maxWidth: 520, margin: "0 auto", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: `1px solid ${C.greyBorder}` },
    logo: { textAlign: "center", fontSize: 36, fontWeight: 800, color: C.black, marginBottom: 2, letterSpacing: -1 },
    logoAccent: { color: C.green },
    subtitle: { textAlign: "center", color: C.greyMid, fontSize: 11, marginBottom: 24, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 },
    label: { display: "block", fontSize: 11, fontWeight: 700, color: C.greyMid, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
    input: { width: "100%", padding: "12px 14px", borderRadius: 8, border: `1.5px solid ${C.greyBorder}`, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border 0.2s", background: C.grey },
    row: { display: "flex", gap: 10, marginBottom: 16 },
    btn: (active) => ({
      flex: 1, padding: "11px 6px", borderRadius: 8, border: active ? `2px solid ${C.green}` : `1.5px solid ${C.greyBorder}`,
      background: active ? C.green : C.white, color: active ? C.white : C.dark,
      fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", textAlign: "center", fontFamily: "inherit"
    }),
    primary: { width: "100%", padding: "14px", borderRadius: 10, border: "none", background: C.green, color: C.white, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 8, transition: "opacity 0.2s" },
    secondary: { width: "100%", padding: "12px", borderRadius: 10, border: `1.5px solid ${C.dark}`, background: "transparent", color: C.dark, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 8 },
    chip: (active) => ({
      display: "inline-block", padding: "8px 14px", borderRadius: 20, border: active ? `2px solid ${C.green}` : `1.5px solid ${C.greyBorder}`,
      background: active ? C.green : C.white, color: active ? C.white : C.dark,
      fontSize: 12, fontWeight: 600, cursor: "pointer", margin: "0 6px 8px 0", transition: "all 0.2s", fontFamily: "inherit"
    }),
    section: { fontSize: 16, fontWeight: 700, marginBottom: 10, marginTop: 18, color: C.black },
    greenBanner: { background: C.greenLight, borderRadius: 10, padding: 16, marginBottom: 16, textAlign: "center" },
  };

  const canNext = () => {
    if (step === 0) return form.name && form.email && form.emailConfirm && form.email === form.emailConfirm && form.healthGoal;
    if (step === 1) return form.age && form.weight && form.height;
    return true;
  };

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      {fridgeOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setFridgeOpen(false)}>
          <div style={{ background: C.white, borderRadius: 16, padding: 22, maxWidth: 480, width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>🧊 What's in my fridge?</div>
              <span style={{ cursor: "pointer", fontSize: 22, color: C.greyMid }} onClick={() => setFridgeOpen(false)}>×</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <button onClick={() => setFridgeTab("match")} style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", border: `1.5px solid ${fridgeTab === "match" ? C.green : C.greyBorder}`, background: fridgeTab === "match" ? C.greenLight : C.white, color: fridgeTab === "match" ? C.greenDark : C.greyMid }}>🔍 Match my meals</button>
              <button onClick={() => setFridgeTab("ai")} style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", border: `1.5px solid ${fridgeTab === "ai" ? C.green : C.greyBorder}`, background: fridgeTab === "ai" ? C.greenLight : C.white, color: fridgeTab === "ai" ? C.greenDark : C.greyMid }}>✨ AI Chef</button>
            </div>

            {fridgeTab === "ai" && (
              <div>
                {!user ? (
                  <div style={{ textAlign: "center", padding: "20px 10px" }}>
                    <div style={{ fontSize: 32 }}>✨</div>
                    <div style={{ fontWeight: 700, fontSize: 15, margin: "8px 0 4px" }}>AI Chef is a free member feature</div>
                    <div style={{ fontSize: 13, color: C.greyMid, marginBottom: 14 }}>Sign up free and the AI Chef will turn whatever's in your fridge — typed or photographed — into a recipe built around your goals.</div>
                    <button onClick={() => { setFridgeOpen(false); onExitGuest(); }} style={{ padding: "12px 22px", background: C.green, color: C.white, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Sign Up Free</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 12, color: C.greyMid, marginBottom: 10 }}>Type your ingredients and/or add a photo — the AI Chef will create a recipe around your calorie target, diet and allergens.</div>
                    <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="e.g. chicken thighs, half a courgette, feta, leftover rice" rows={2}
                      style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1.5px solid ${C.greyBorder}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", marginBottom: 8 }} />
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                      <label style={{ padding: "9px 14px", border: `1.5px solid ${C.greyBorder}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: C.dark }}>
                        📷 {aiImage ? "Change photo" : "Add photo"}
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleAiPhoto(e.target.files[0])} />
                      </label>
                      {aiImage && <img src={aiImage.preview} alt="ingredients" style={{ height: 40, borderRadius: 6 }} />}
                      {aiImage && <span onClick={() => setAiImage(null)} style={{ cursor: "pointer", color: C.greyMid, fontSize: 18 }}>×</span>}
                      <button onClick={generateAiRecipe} disabled={aiLoading || (!aiInput.trim() && !aiImage)} style={{ marginLeft: "auto", padding: "10px 18px", background: aiLoading || (!aiInput.trim() && !aiImage) ? C.greyBorder : C.green, color: C.white, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{aiLoading ? "Cooking..." : "✨ Create Recipe"}</button>
                    </div>
                    {aiError && <div style={{ background: "#fee", color: "#c00", padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 10 }}>{aiError}</div>}
                    {aiLoading && <div style={{ textAlign: "center", padding: 18, color: C.greyMid, fontSize: 13 }}>The AI Chef is thinking through your ingredients...</div>}
                    {aiRecipe && (
                      <div style={{ background: C.grey, borderRadius: 12, padding: 16 }}>
                        <div style={{ fontWeight: 800, fontSize: 17 }}>{aiRecipe.name}</div>
                        <div style={{ fontSize: 13, color: "#555", margin: "4px 0 8px" }}>{aiRecipe.description}</div>
                        <div style={{ fontSize: 12, color: C.greyMid, marginBottom: 10 }}>
                          {aiRecipe.cal} kcal | P: {aiRecipe.protein}g | C: {aiRecipe.carbs}g | F: {aiRecipe.fat}g{aiRecipe.fibre ? ` | Fibre: ${aiRecipe.fibre}g` : ""}{aiRecipe.prepTime ? ` | ⏱ ${aiRecipe.prepTime} min` : ""}
                          <span style={{ display: "block", marginTop: 2, fontSize: 10 }}>AI-estimated macros — treat as a guide</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Ingredients</div>
                        <div style={{ fontSize: 12, color: "#555", lineHeight: 1.8, marginBottom: 8 }}>
                          {(aiRecipe.ingredients || []).map((ing, i) => <div key={i}>• {ing.qty} {ing.item}</div>)}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Method</div>
                        <div style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}>
                          {(aiRecipe.steps || []).map((s, i) => <div key={i} style={{ marginBottom: 4 }}><strong>{i + 1}.</strong> {s}</div>)}
                        </div>
                        <button onClick={generateAiRecipe} style={{ marginTop: 12, padding: "9px 16px", background: C.white, color: C.green, border: `1.5px solid ${C.green}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🔄 Try another idea</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {fridgeTab === "match" && (<div>
            <div style={{ fontSize: 12, color: C.greyMid, marginBottom: 10 }}>List your ingredients (separated by commas) and we'll find meals you can make.</div>
            <textarea value={fridgeInput} onChange={e => setFridgeInput(e.target.value)} placeholder="e.g. chicken, rice, broccoli, eggs, greek yogurt" rows={3}
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1.5px solid ${C.greyBorder}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", marginBottom: 12 }} />
            {fridgeInput.trim().length >= 3 && fridgeMatches.length === 0 && (
              <div style={{ fontSize: 13, color: C.greyMid, textAlign: "center", padding: 14 }}>No matches yet — try naming main ingredients like "chicken" or "oats".</div>
            )}
            {fridgeMatches.map(({ meal, slot, have, missing }) => {
              const open = fridgeExpanded === meal.name;
              return (
                <div key={meal.name} onClick={() => setFridgeExpanded(open ? null : meal.name)} style={{ background: C.grey, borderRadius: 10, padding: 12, marginBottom: 8, cursor: "pointer", borderLeft: `4px solid ${missing.length === 0 ? C.green : C.greyBorder}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, textTransform: "uppercase", color: C.greyMid, letterSpacing: 1, fontWeight: 600 }}>{slot}</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{meal.name}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: missing.length === 0 ? C.green : C.dark }}>{have.length}/{meal.ingredients.length}</div>
                      <div style={{ fontSize: 9, color: C.greyMid }}>ingredients</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.greyMid, marginTop: 3 }}>
                    {meal.cal} kcal | P: {meal.protein}g{meal.prepTime ? ` | ⏱ ${meal.prepTime} min` : ""}
                    {missing.length > 0 && missing.length <= 4 && <span> | need: {missing.join(", ")}</span>}
                    {missing.length > 4 && <span> | need {missing.length} more items</span>}
                  </div>
                  {open && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.greyBorder}` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Recipe</div>
                      <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>{meal.recipe}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8, marginBottom: 4 }}>Ingredients</div>
                      <div style={{ fontSize: 12, color: "#555", lineHeight: 1.8 }}>
                        {meal.ingredients.map((ing, i) => <div key={i}>{have.includes(ing.item) ? "✅" : "◻️"} {ing.qty} {ing.item}</div>)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>)}
          </div>
        </div>
      )}

      {viewSaved && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }} onClick={() => setViewSaved(false)}>
          <div style={{ background: C.white, borderRadius: 16, padding: 24, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>❤️ My Saved Meals</div>
              <button onClick={() => setViewSaved(false)} style={{ background: "transparent", border: "none", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>
            {savedMeals.length === 0 && (
              <div style={{ textAlign: "center", color: C.greyMid, padding: 40, fontSize: 13 }}>No saved meals yet. Tap the 🤍 on any meal to save it.</div>
            )}
            {savedMeals.map(s => {
              const m = s.meal_data;
              return (
                <div key={s.id} style={{ background: C.grey, borderRadius: 10, padding: 14, marginBottom: 8, borderLeft: "4px solid " + C.green }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: C.greyMid, marginBottom: 6 }}>{m.cal} kcal • P: {m.protein}g • C: {m.carbs}g • F: {m.fat}g</div>
                      <div style={{ fontSize: 12, color: C.dark, lineHeight: 1.5 }}>{m.recipe}</div>
                      <div style={{ fontSize: 11, color: C.greyMid, marginTop: 6 }}><strong>Ingredients:</strong> {m.ingredients?.map(i => i.qty + " " + i.item).join(", ")}</div>
                    </div>
                    <button onClick={() => toggleSaveMeal(m)} style={{ background: "transparent", border: "none", fontSize: 22, cursor: "pointer" }} title="Remove from saved">❤️</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {viewHidden && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }} onClick={() => setViewHidden(false)}>
          <div style={{ background: C.white, borderRadius: 16, padding: 24, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>🚫 Hidden Meals</div>
              <button onClick={() => setViewHidden(false)} style={{ background: "transparent", border: "none", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>
            {hiddenMeals.length === 0 && (
              <div style={{ textAlign: "center", color: C.greyMid, padding: 40, fontSize: 13 }}>No hidden meals. Tap the 👎 on any meal to hide it from future plans.</div>
            )}
            {hiddenMeals.map(h => (
              <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: C.grey, borderRadius: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{h.meal_name}</span>
                <button onClick={() => unhideMeal(h.id)} style={{ background: C.green, color: C.white, border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Unhide</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ maxWidth: 560, margin: "0 auto", paddingTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><div style={S.logo}>PT<span style={S.logoAccent}>:</span>U</div><div style={{ display: "flex", gap: 8 }}><button onClick={() => setFridgeOpen(true)} style={{ background: "transparent", border: "1px solid #ddd", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "inherit" }}>🧊 Fridge</button>{user && <><button onClick={() => setViewSaved(true)} style={{ background: "transparent", border: "1px solid #ddd", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "inherit" }}>❤️ ({savedMeals.length})</button><button onClick={() => setViewHidden(true)} style={{ background: "transparent", border: "1px solid #ddd", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "inherit" }}>🚫 ({hiddenMeals.length})</button></>}<button onClick={() => guest ? onExitGuest() : supabase.auth.signOut()} style={{ background: "transparent", border: "1px solid #ddd", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "inherit" }}>{guest ? "Sign Up / Log In" : "Log out"}</button></div></div>
        <div style={S.subtitle}>Personalised Meal Planner</div>

        {step < 6 && <StepIndicator current={step} total={6} />}

        <div style={S.card}>

          {/* ── STEP 0: WELCOME / LEAD CAPTURE ── */}
          {step === 0 && (<div>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 6 }}>💪</div>
              <div style={S.section}>Let's Build Your Plan</div>
              <div style={{ fontSize: 13, color: C.greyMid, lineHeight: 1.6 }}>Enter your details below and we'll create a personalised, evidence-based meal plan tailored to your goals.</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Your Name</label>
              <input style={S.input} placeholder="e.g. Sarah" value={form.name} onChange={e => update("name", e.target.value)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Email Address</label>
              <input style={S.input} type="email" placeholder="you@email.com" value={form.email} onChange={e => update("email", e.target.value)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Confirm Email</label>
              <input style={S.input} type="email" placeholder="Confirm your email" value={form.emailConfirm} onChange={e => update("emailConfirm", e.target.value)} />
              {form.email && form.emailConfirm && form.email !== form.emailConfirm && <div style={{ color: "#e53935", fontSize: 12, marginTop: 4 }}>Emails do not match</div>}
              {form.email && form.emailConfirm && form.email === form.emailConfirm && <div style={{ color: "#8BC43F", fontSize: 12, marginTop: 4 }}>✓ Emails match</div>}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>What's Your Primary Goal?</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  { id: "strength", label: "Strength", icon: "🏋️" },
                  { id: "fat_loss", label: "Fat Loss", icon: "🔥" },
                  { id: "muscle_gain", label: "Muscle Gain", icon: "💪" },
                  { id: "general_fitness", label: "General Fitness", icon: "🏃" },
                ].map(g => (
                  <button key={g.id} onClick={() => update("healthGoal", g.id)} style={{
                    flex: "1 1 45%", padding: "14px 10px", borderRadius: 10,
                    border: form.healthGoal === g.id ? `2px solid ${C.green}` : `1.5px solid ${C.greyBorder}`,
                    background: form.healthGoal === g.id ? C.green : C.white,
                    color: form.healthGoal === g.id ? C.white : C.dark,
                    cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s", textAlign: "center"
                  }}>
                    <div style={{ fontSize: 22 }}>{g.icon}</div>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <button style={{ ...S.primary, opacity: canNext() ? 1 : 0.4 }} disabled={!canNext()} onClick={() => { saveLead(); setStep(1); }}>
              Get Started →
            </button>
          </div>)}

          {/* ── STEP 1: BODY STATS ── */}
          {step === 1 && (<div>
            <div style={S.section}>Your Details</div>
            <div style={S.row}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Gender</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={S.btn(form.gender==="male")} onClick={() => update("gender","male")}>Male</button>
                  <button style={S.btn(form.gender==="female")} onClick={() => update("gender","female")}>Female</button>
                </div>
              </div>
            </div>
            <div style={S.row}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Age</label>
                <input style={S.input} type="number" placeholder="25" value={form.age} onChange={e => update("age", e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Weight (kg)</label>
                <input style={S.input} type="number" placeholder="75" value={form.weight} onChange={e => update("weight", e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Height (cm)</label>
                <input style={S.input} type="number" placeholder="175" value={form.height} onChange={e => update("height", e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Activity Level</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[["sedentary","Sedentary","Desk job, no exercise"],["light","Lightly Active","On your feet at work or light exercise 1-2x/week"],["moderate","Moderately Active","Exercise 3-5x/week or active job"],["active","Very Active","Hard exercise 6-7x/week or physical job + training"],["very_active","Extra Active","Intense training daily or physical job + heavy training"]].map(([v,l,d]) => (
                  <button key={v} onClick={() => update("activity",v)} style={{
                    display: "flex", flexDirection: "column", width: "100%", padding: "10px 14px", borderRadius: 8, textAlign: "left",
                    border: form.activity===v ? "2px solid "+C.green : "1.5px solid "+C.greyBorder,
                    background: form.activity===v ? C.green : C.white, color: form.activity===v ? C.white : C.dark,
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", boxSizing: "border-box"
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{l}</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{d}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {!user && <button style={S.secondary} onClick={() => setStep(0)}>← Back</button>}
              <button style={{ ...S.primary, opacity: canNext() ? 1 : 0.4 }} disabled={!canNext()} onClick={() => setStep(2)}>Continue →</button>
            </div>
          </div>)}

          {/* ── STEP 2: GOAL & CALORIES ── */}
          {step === 2 && (<div>
            <div style={S.greenBanner}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: C.greyMid, fontWeight: 600 }}>{form.goal === "fat_loss" ? "Your Fat Loss Calories" : form.goal === "muscle_gain" ? "Your Muscle Gain Calories" : "Your Maintenance Calories"}</div>
              <div style={{ fontSize: 42, fontWeight: 800, color: C.green, transition: "all 0.3s" }}>{target} <span style={{ fontSize: 15, fontWeight: 400, color: C.dark }}>kcal/day</span></div>
              <div style={{ fontSize: 12, color: C.greyMid, marginTop: 4 }}>Protein target: <strong style={{ color: C.black }}>{proteinTarget}g/day</strong> ({form.goal === "fat_loss" ? "2.0" : "1.8"}g/kg)</div>
            </div>
            <div style={S.section}>Choose Your Calorie Goal</div>
            {[
              { id: "fat_loss", label: "Fat Loss", desc: `${goalCalories(tdee,"fat_loss")} kcal/day (−20%)`, icon: "🔥", note: "2.0g/kg protein to preserve lean mass" },
              { id: "maintenance", label: "Maintenance", desc: `${goalCalories(tdee,"maintenance")} kcal/day`, icon: "⚖️", note: "1.8g/kg protein" },
              { id: "muscle_gain", label: "Muscle Gain", desc: `${goalCalories(tdee,"muscle_gain")} kcal/day (+15%)`, icon: "💪", note: "1.8g/kg protein for growth" },
            ].map(g => (
              <button key={g.id} onClick={() => update("goal", g.id)} style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 14px", borderRadius: 10, marginBottom: 8,
                border: form.goal === g.id ? `2px solid ${C.green}` : `1.5px solid ${C.greyBorder}`,
                background: form.goal === g.id ? C.green : C.white, color: form.goal === g.id ? C.white : C.dark,
                cursor: "pointer", boxSizing: "border-box", textAlign: "left", transition: "all 0.2s", fontFamily: "inherit"
              }}>
                <span style={{ fontSize: 26 }}>{g.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{g.label}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{g.desc}</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>{g.note}</div>
                </div>
              </button>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button style={S.secondary} onClick={() => setStep(1)}>← Back</button>
              <button style={S.primary} onClick={() => setStep(3)}>Continue →</button>
            </div>
          </div>)}

          {/* ── STEP 3: DIET, ALLERGENS, CONDITIONS ── */}
          {step === 3 && (<div>
            <div style={S.section}>Dietary Preference</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {[["no-restrictions","No Restrictions"],["vegetarian","Vegetarian"],["vegan","Vegan"],["keto","Keto"]].map(([v,l]) => (
                <button key={v} onClick={() => update("diet",v)} style={{ ...S.btn(form.diet===v), flex: "none", padding: "11px 18px" }}>{l}</button>
              ))}
            </div>

            <div style={S.section}>Allergens / Foods to Avoid</div>
            <div style={{ marginBottom: 12 }}>
              {ALLERGENS.map(a => (
                <span key={a} style={S.chip(form.allergens.includes(a))} onClick={() => toggleAllergen(a)}>
                  {form.allergens.includes(a) ? "✕ " : ""}{a.charAt(0).toUpperCase()+a.slice(1)}
                </span>
              ))}
            </div>

            <div style={S.section}>Health Conditions</div>
            <div style={{ marginBottom: 8 }}>
              {CONDITIONS.map(c => (
                <span key={c.id} style={S.chip(c.id === "none" ? form.conditions.length === 0 : form.conditions.includes(c.id))} onClick={() => toggleCondition(c.id)}>
                  {c.label}
                </span>
              ))}
            </div>
            {form.conditions.length > 0 && (
              <div style={{ background: C.greenLight, borderRadius: 8, padding: 12, fontSize: 11, color: C.dark, lineHeight: 1.6, marginBottom: 8 }}>
                <strong>Evidence-based approach:</strong> Your meals will be filtered using guidelines from peer-reviewed research:
                {form.conditions.includes("high_bp") && <div style={{ marginTop: 4 }}>• <strong>High BP:</strong> DASH diet principles (NCBI PMC10551663) — low sodium, rich in potassium, magnesium, calcium</div>}
                {form.conditions.includes("high_chol") && <div style={{ marginTop: 4 }}>• <strong>High Cholesterol:</strong> Low saturated fat, high soluble fibre from oats/legumes (PubMed 25430608)</div>}
                {form.conditions.includes("type2_diabetes") && <div style={{ marginTop: 4 }}>• <strong>Type 2 Diabetes:</strong> Low-GI foods prioritised — shown to reduce HbA1c and fasting glucose (PubMed 31374573)</div>}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button style={S.secondary} onClick={() => setStep(2)}>← Back</button>
              <button style={S.primary} onClick={() => setStep(4)}>Continue →</button>
            </div>
          </div>)}

          {/* ── STEP 4: MEALS & PEOPLE ── */}
          {step === 4 && (<div>
            <div style={S.section}>Meals Per Day</div>
            <div style={S.row}>
              <button style={S.btn(form.mealsPerDay===4)} onClick={() => update("mealsPerDay",4)}>3 Meals + Snack</button>
              <button style={S.btn(form.mealsPerDay===3)} onClick={() => update("mealsPerDay",3)}>3 Meals (no snack)</button>
            </div>

            <div style={S.section}>Number of People</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <button onClick={() => update("people", Math.max(1, form.people - 1))} style={{
                width: 44, height: 44, borderRadius: "50%", border: `1.5px solid ${C.greyBorder}`, background: C.white, fontSize: 20, cursor: "pointer", fontWeight: 700, color: C.dark
              }}>−</button>
              <span style={{ fontSize: 30, fontWeight: 800, minWidth: 40, textAlign: "center" }}>{form.people}</span>
              <button onClick={() => update("people", Math.min(10, form.people + 1))} style={{
                width: 44, height: 44, borderRadius: "50%", border: `1.5px solid ${C.greyBorder}`, background: C.white, fontSize: 20, cursor: "pointer", fontWeight: 700, color: C.dark
              }}>+</button>
              <span style={{ fontSize: 13, color: C.greyMid }}>{form.people === 1 ? "person" : "people"}</span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button style={S.secondary} onClick={() => setStep(3)}>← Back</button>
              <button style={S.primary} onClick={() => setStep(5)}>Continue →</button>
            </div>
          </div>)}

          {/* ── STEP 5: REVIEW ── */}
          {step === 5 && (<div>
            <div style={S.section}>Review Your Plan</div>
            <div style={{ background: C.grey, borderRadius: 10, padding: 16, marginBottom: 14 }}>
              {[
                ["Name", form.name],
                ["Target Calories", `${target} kcal/day`],
                ["Protein Target", `${proteinTarget}g/day`],
                ["Goal", form.goal.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())],
                ["Diet", form.diet.replace(/-/g," ").replace(/\b\w/g,l=>l.toUpperCase())],
                ["Meals/Day", form.mealsPerDay],
                ["People", form.people],
                ["Allergens", form.allergens.length ? form.allergens.join(", ") : "None"],
                ["Conditions", form.conditions.length ? form.conditions.map(c=>c.replace(/_/g," ")).join(", ") : "None"],
              ].map(([k,v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.greyBorder}`, fontSize: 13 }}>
                  <span style={{ color: C.greyMid, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            {availabilityWarning.length > 0 && (
              <div style={{ background: "#fff8e1", border: "1.5px solid #f0c94f", color: "#7a5c00", padding: 14, borderRadius: 10, fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
                <strong>We couldn't find any {availabilityWarning.join(" or ")} recipes</strong> matching that combination of diet, allergens and health conditions. Go back and adjust one of your selections — we're adding new recipes all the time.
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button style={S.secondary} onClick={() => { setAvailabilityWarning([]); setStep(4); }}>← Back</button>
              <button style={S.primary} onClick={doGenerate}>
                {generating ? "Generating..." : "Generate Meal Plan →"}
              </button>
            </div>
          </div>)}

          {/* ── STEP 6: RESULTS ── */}
          {step === 6 && plan && (<div>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 38 }}>🥗</div>
              <div style={{ ...S.section, textAlign: "center", marginTop: 4 }}>Your 5-Day Meal Plan</div>
              <div style={{ fontSize: 12, color: C.greyMid }}>{target} kcal/day • {proteinTarget}g protein • {form.people} {form.people===1?"person":"people"}</div>
            </div>

            <div style={{ background: C.grey, borderRadius: 12, padding: 16, marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.greyMid, marginBottom: 12 }}>Daily Macro Breakdown</div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 24 }}>
                {(() => {
                  // Averages from the ACTUAL generated meals — always matches the plan below
                  const days = plan.length || 1;
                  const avgCal = Math.round(plan.reduce((s, d) => s + d.totalCal, 0) / days);
                  const avgP = Math.round(plan.reduce((s, d) => s + d.totalProtein, 0) / days);
                  const avgC = Math.round(plan.reduce((s, d) => s + (d.totalCarbs || 0), 0) / days);
                  const avgF = Math.round(plan.reduce((s, d) => s + (d.totalFat || 0), 0) / days);
                  const avgNet = Math.round(plan.reduce((s, d) => s + (d.totalNetCarbs || 0), 0) / days);
                  const macroCal = avgP * 4 + avgC * 4 + avgF * 9;
                  const pPct = Math.round(avgP * 4 / macroCal * 100);
                  const cPct = Math.round(avgC * 4 / macroCal * 100);
                  const fPct = 100 - pPct - cPct;
                  const r = 15.9155;
                  const slices = [{ pct: pPct, color: "#8BC43F" }, { pct: cPct, color: "#353535" }, { pct: fPct, color: "#f59e0b" }];
                  const legend = [["Protein", avgP, pPct, "#8BC43F"], ["Carbs", avgC, cPct, "#353535"], ["Fats", avgF, fPct, "#f59e0b"]];
                  let offset = 25;
                  return (<>
                    <svg width="120" height="120" viewBox="0 0 42 42">
                      {slices.map((s, i) => {
                        const el = <circle key={i} cx="21" cy="21" r={r} fill="none" stroke={s.color} strokeWidth="6" strokeDasharray={`${s.pct} ${100 - s.pct}`} strokeDashoffset={-offset + 100} />;
                        offset += s.pct;
                        return el;
                      })}
                      <text x="21" y="19" textAnchor="middle" fontSize="5" fontWeight="700" fill="#353535">{avgCal}</text>
                      <text x="21" y="24" textAnchor="middle" fontSize="3" fill="#888">kcal/day</text>
                    </svg>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {legend.map(([label, grams, pct, color]) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }}></div>
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{label} <span style={{ color: C.greyMid, fontWeight: 400 }}>{grams}g</span></div>
                            <div style={{ fontSize: 10, color: C.greyMid }}>{pct}% of calories</div>
                          </div>
                        </div>
                      ))}
                      {form.diet === "keto" && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: avgNet <= 50 ? C.green : "#c00", background: avgNet <= 50 ? C.greenLight : "#fee", padding: "5px 9px", borderRadius: 6, marginTop: 2 }}>
                          {avgNet}g net carbs/day {avgNet <= 50 ? "✓ keto" : "— over 50g"}
                        </div>
                      )}
                    </div>
                  </>);
                })()}
              </div>
            </div>

            {plan[0].healthNotes.length > 0 && (
              <div style={{ background: C.greenLight, borderRadius: 10, padding: 14, fontSize: 12, lineHeight: 1.6, marginBottom: 16, color: C.dark }}>
                <strong style={{ color: C.black }}>Evidence-Based Health Notes:</strong>
                {plan[0].healthNotes.map((n,i) => <div key={i} style={{ marginTop: 4 }}>• {n}</div>)}
              </div>
            )}

            {plan.map(day => (
              <div key={day.day} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Day {day.day}</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 11, color: C.greyMid }}>{day.totalCal} kcal | P: {day.totalProtein}g | C: {day.totalCarbs}g | F: {day.totalFat}g{form.diet === "keto" ? ` | ${day.totalNetCarbs}g net` : ""}</span>
                    {day.totalProtein < proteinTarget * 0.9
                      ? <div style={{ fontSize: 10, color: "#b45309", fontWeight: 600 }}>⚠ {proteinTarget - day.totalProtein}g under protein target</div>
                      : Math.abs(day.totalCal - target) <= target * 0.05
                      ? <div style={{ fontSize: 10, color: C.green, fontWeight: 600 }}>✓ On target</div>
                      : <div style={{ fontSize: 10, color: "#d97706", fontWeight: 600 }}>{day.totalCal < target ? "↓" : "↑"} {Math.abs(day.totalCal - target)} kcal {day.totalCal < target ? "under" : "over"}</div>
                    }
                  </div>
                </div>
                {Object.entries(day.meals).filter(([, meal]) => meal).map(([type, meal]) => {
                  if (!meal) return null;
                  const isOpen = showRecipe === `${day.day}-${type}`;
                  return (
                    <div key={type} style={{ background: C.grey, borderRadius: 8, padding: "12px 14px", marginBottom: 6, cursor: "pointer", borderLeft: `4px solid ${C.green}`, transition: "all 0.2s" }}
                      onClick={() => setShowRecipe(isOpen ? null : `${day.day}-${type}`)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 10, textTransform: "uppercase", color: C.greyMid, letterSpacing: 1, fontWeight: 600 }}>{type}</div>
                          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{meal.name}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span onClick={(e) => { e.stopPropagation(); swapMeal(day.day, type); }} style={{ fontSize: 17, cursor: "pointer", opacity: 0.6 }} title="Swap this meal for another">🔄</span>{user && <><span onClick={(e) => { e.stopPropagation(); toggleSaveMeal(meal); }} style={{ fontSize: 20, cursor: "pointer" }}>{isSaved(meal.name) ? "❤️" : "🤍"}</span><span onClick={(e) => { e.stopPropagation(); if(window.confirm("Hide this meal from future plans?")) hideMeal(meal); }} style={{ fontSize: 18, cursor: "pointer", opacity: 0.5 }} title="Don't show me again">👎</span></>}<div style={{ textAlign: "right" }}><div style={{ fontWeight: 700, fontSize: 14, color: C.green }}>{meal.cal}</div><div style={{ fontSize: 10, color: C.greyMid }}>kcal</div></div></div>
                      </div>
                      <div style={{ fontSize: 11, color: C.greyMid, marginTop: 3 }}>
                        P: {meal.protein}g &nbsp; C: {meal.carbs}g &nbsp; F: {meal.fat}g
                        {meal.prepTime ? <span style={{ marginLeft: 8 }}>⏱ {meal.prepTime} min</span> : null}
                        {meal.portionScale && meal.portionScale !== 1 && (
                          <span style={{ marginLeft: 8, color: C.green, fontWeight: 600 }}>
                            ({meal.portionScale < 1 ? "↓" : "↑"} {Math.round(meal.portionScale * 100)}% portion)
                          </span>
                        )}
                      </div>
                      {isOpen && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.greyBorder}` }}>
                          {meal.portionScale && meal.portionScale !== 1 && (
                            <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginBottom: 8, padding: "6px 10px", background: C.greenLight, borderRadius: 6 }}>
                              Portions adjusted to {Math.round(meal.portionScale * 100)}% to match your {target} kcal/day target
                            </div>
                          )}
                          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: C.black }}>Recipe</div>
                          <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>{meal.recipe}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 10, marginBottom: 4, color: C.black }}>Ingredients (adjusted){form.people > 1 ? ` × ${form.people} people` : ""}</div>
                          <div style={{ fontSize: 12, color: "#555", lineHeight: 1.8 }}>
                            {meal.ingredients.map((ing, i) => <div key={i}>• {ing.qty} {ing.item}</div>)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 8, marginBottom: 20 }}>
              <button style={S.secondary} onClick={() => { setPlan(null); setStep(user ? 1 : 0); setShowRecipe(null); }}>Start Over</button>
              <button style={{ ...S.secondary, borderColor: C.green, color: C.green }} onClick={doRegenerate}>{generating ? "Regenerating..." : "🔄 Regenerate"}</button>
              <button style={S.primary} onClick={handlePrint}>📄 Print / Save PDF</button>
            </div>
            {/* SHOPPING LIST */}
            <div style={{ ...S.section, marginTop: 24, display: "flex", alignItems: "center", gap: 8 }}>
              🛒 Shopping List
              <span style={{ fontSize: 11, fontWeight: 400, color: C.greyMid }}>×{form.people} {form.people===1?"person":"people"}</span>
            </div>
            <div style={{ background: C.grey, borderRadius: 10, padding: 14 }}>
              {shoppingList.map((group) => (
                <div key={group.category} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.greyMid, padding: "6px 0", borderBottom: `2px solid ${C.greyBorder}` }}>{group.category}</div>
                  {group.items.map((s) => {
                    const ticked = !!checkedItems[s.item];
                    return (
                      <div key={s.item} onClick={() => setCheckedItems(c => ({ ...c, [s.item]: !c[s.item] }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.greyBorder}`, fontSize: 13, cursor: "pointer", opacity: ticked ? 0.45 : 1 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${ticked ? C.green : C.greyBorder}`, background: ticked ? C.green : C.white, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{ticked ? "✓" : ""}</div>
                        <span style={{ fontWeight: 600, textDecoration: ticked ? "line-through" : "none", flex: 1 }}>{s.item}</span>
                        <span style={{ color: C.greyMid, fontSize: 12 }}>{s.qty}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

          </div>)}
        </div>

        <div style={{ textAlign: "center", fontSize: 10, color: "#bbb", marginTop: 16, lineHeight: 1.5 }}>
          PT:U Personal Training | www.pt-u.co.uk<br />
          Calorie estimates use the Mifflin-St Jeor equation. Protein targets based on ISSN position stand (1.6-2.0g/kg/day).<br />
          Health condition guidance informed by peer-reviewed research from NCBI/PubMed. Always consult a healthcare professional.
        </div>
      </div>
    </div>
  );
}
