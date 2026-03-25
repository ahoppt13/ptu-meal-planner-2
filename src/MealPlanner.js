import { useState, useCallback, useMemo } from "react";

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

// ─── COMPREHENSIVE MEAL DATABASE ─────────────────────────────────
// Tags: no-restrictions, vegetarian, vegan, keto
// Health flags: low_sodium, low_gi, low_sat_fat, high_fibre
const MEALS = {
  breakfast: [
    // ── QUICK (<5 MINS) — NO-RESTRICTIONS ──
    { name: "Cream Cheese & Strawberries on Sourdough", cal: 326, protein: 26, carbs: 42, fat: 6, tags: ["no-restrictions"], health: ["low_sodium","low_sat_fat"], allergens: ["dairy","gluten"], recipe: "Toast 1 slice sourdough until golden. Beat 80g non-fat cream cheese with 15g whey protein. Spread onto toast, top with 100g sliced strawberries and drizzle 17g honey. Ready in under 5 mins.", ingredients: [{ item: "Non-fat cream cheese", qty: "80g" },{ item: "Sourdough bread", qty: "1 slice (50g)" },{ item: "Strawberries", qty: "100g" },{ item: "Honey", qty: "17g" },{ item: "Whey protein powder", qty: "15g" }] },
    { name: "Coffee & Cream Protein Smoothie", cal: 378, protein: 37, carbs: 26, fat: 14, tags: ["no-restrictions"], health: ["low_sodium","low_sat_fat"], allergens: ["dairy","nuts"], recipe: "Add 125g ice, 125g cooled coffee, 100g almond milk, 15g vanilla whey protein, 200g 0% Greek yogurt, 20g double cream, 80g frozen banana and 1/2 tsp vanilla to a blender. Blend until smooth. Under 5 mins.", ingredients: [{ item: "Brewed coffee (cooled)", qty: "125g" },{ item: "0% Greek yogurt", qty: "200g" },{ item: "Vanilla whey protein", qty: "15g" },{ item: "Frozen banana", qty: "80g" },{ item: "Double cream", qty: "20g" },{ item: "Almond milk", qty: "100g" },{ item: "Ice", qty: "125g" }] },
    { name: "Stacked Berry Parfait", cal: 318, protein: 29, carbs: 19, fat: 14, tags: ["no-restrictions"], health: ["low_sodium","low_gi","low_sat_fat"], allergens: ["dairy"], recipe: "Mix 250g 0% Greek yogurt with 1 tsp sweetener and 1/4 tsp vanilla. Puree 75g raspberries. Layer yogurt, raspberry puree, 75g blueberries and 22g desiccated coconut in a glass. Refrigerate 20 mins or prep the night before.", ingredients: [{ item: "0% Greek yogurt", qty: "250g" },{ item: "Blueberries", qty: "75g" },{ item: "Raspberries", qty: "75g" },{ item: "Desiccated coconut", qty: "22g" },{ item: "Vanilla extract", qty: "1/4 tsp" }] },
    { name: "Smoked Salmon & Cream Cheese Bagel", cal: 430, protein: 28, carbs: 40, fat: 18, tags: ["no-restrictions"], health: ["low_sat_fat"], allergens: ["gluten","dairy","fish"], recipe: "Toast 1 bagel. Spread 30g cream cheese. Layer 60g smoked salmon, capers, red onion slices, and fresh dill. Under 5 mins.", ingredients: [{ item: "Bagel", qty: "1" },{ item: "Cream cheese", qty: "30g" },{ item: "Smoked salmon", qty: "60g" },{ item: "Capers", qty: "1 tsp" },{ item: "Red onion", qty: "2 slices" },{ item: "Fresh dill", qty: "sprig" }] },
    { name: "Scrambled Eggs & Avocado Toast", cal: 420, protein: 24, carbs: 35, fat: 22, tags: ["no-restrictions"], health: ["low_sodium"], allergens: ["eggs","gluten"], recipe: "Toast 2 slices wholegrain bread. Scramble 3 eggs with black pepper in olive oil (2-3 mins). Mash half an avocado on toast, top with eggs and chilli flakes. Under 5 mins.", ingredients: [{ item: "Wholegrain bread", qty: "2 slices" },{ item: "Eggs", qty: "3" },{ item: "Avocado", qty: "1/2" },{ item: "Olive oil", qty: "1 tsp" },{ item: "Chilli flakes", qty: "pinch" }] },
    { name: "Ham, Cheese & Egg Wrap", cal: 380, protein: 32, carbs: 25, fat: 18, tags: ["no-restrictions"], health: ["low_sodium","low_gi"], allergens: ["eggs","gluten","dairy"], recipe: "Scramble 2 eggs (2 mins). Lay 40g sliced ham and 20g grated cheese on a wholegrain wrap, top with eggs. Roll and eat. Under 5 mins.", ingredients: [{ item: "Eggs", qty: "2" },{ item: "Sliced ham", qty: "40g" },{ item: "Cheddar cheese", qty: "20g" },{ item: "Wholegrain wrap", qty: "1" }] },
    { name: "Protein Yogurt & Granola Bowl", cal: 370, protein: 32, carbs: 38, fat: 10, tags: ["no-restrictions"], health: ["low_sodium","low_sat_fat"], allergens: ["dairy","gluten"], recipe: "Mix 200g 0% Greek yogurt with 1 scoop whey protein until smooth. Top with 40g granola and 80g mixed berries. Under 3 mins.", ingredients: [{ item: "0% Greek yogurt", qty: "200g" },{ item: "Whey protein powder", qty: "30g" },{ item: "Granola", qty: "40g" },{ item: "Mixed berries", qty: "80g" }] },
    // ── PREP NIGHT BEFORE ──
    { name: "Overnight Oats with Banana", cal: 380, protein: 15, carbs: 55, fat: 12, tags: ["no-restrictions"], health: ["low_sodium","high_fibre","low_gi","low_sat_fat"], allergens: ["gluten","dairy"], recipe: "Night before: Mix 60g rolled oats with 200ml milk, 1 tbsp chia seeds, 1 tbsp maple syrup. Refrigerate overnight. Morning: top with sliced banana and 15g almonds. Grab and go.", ingredients: [{ item: "Rolled oats", qty: "60g" },{ item: "Milk", qty: "200ml" },{ item: "Chia seeds", qty: "1 tbsp" },{ item: "Maple syrup", qty: "1 tbsp" },{ item: "Banana", qty: "1" },{ item: "Almonds", qty: "15g" }] },
    { name: "Overnight Protein Oats (Chocolate PB)", cal: 410, protein: 30, carbs: 45, fat: 14, tags: ["no-restrictions"], health: ["low_sodium","high_fibre","low_gi"], allergens: ["gluten","dairy","nuts"], recipe: "Night before: Mix 60g rolled oats, 200ml milk, 1 scoop chocolate whey protein, 1 tbsp peanut butter. Refrigerate overnight. Morning: stir, top with sliced banana. Grab and go.", ingredients: [{ item: "Rolled oats", qty: "60g" },{ item: "Milk", qty: "200ml" },{ item: "Chocolate whey protein", qty: "30g" },{ item: "Peanut butter", qty: "1 tbsp" },{ item: "Banana", qty: "1/2" }] },
    { name: "Turkey Sausage & Egg Muffins (Batch Prep)", cal: 400, protein: 32, carbs: 10, fat: 26, tags: ["no-restrictions"], health: ["low_sodium","low_gi"], allergens: ["eggs"], recipe: "Batch prep: Brown 150g turkey sausage meat. Mix with 4 beaten eggs, diced peppers and spinach. Pour into muffin tin. Bake 180°C 20 mins. Store in fridge up to 4 days. Morning: microwave 60 seconds.", ingredients: [{ item: "Turkey sausage meat", qty: "150g" },{ item: "Eggs", qty: "4" },{ item: "Bell pepper", qty: "1/2" },{ item: "Spinach", qty: "50g" }] },
    // ── KETO (Quick) ──
    { name: "Keto Scrambled Eggs & Avocado", cal: 390, protein: 22, carbs: 4, fat: 32, tags: ["keto","no-restrictions"], health: ["low_sodium","low_gi"], allergens: ["eggs"], recipe: "Scramble 3 eggs in 10g butter (2 mins). Halve an avocado, season with salt, pepper and chilli flakes. Serve together. Under 4 mins.", ingredients: [{ item: "Eggs", qty: "3" },{ item: "Butter", qty: "10g" },{ item: "Avocado", qty: "1/2" },{ item: "Chilli flakes", qty: "pinch" }] },
    { name: "Keto Greek Yogurt & Nut Bowl", cal: 350, protein: 24, carbs: 8, fat: 26, tags: ["keto","no-restrictions"], health: ["low_sodium","low_gi"], allergens: ["dairy","nuts"], recipe: "Spoon 200g full-fat Greek yogurt into a bowl. Top with 25g mixed nuts, 10g coconut flakes, and a few berries. Under 2 mins.", ingredients: [{ item: "Full-fat Greek yogurt", qty: "200g" },{ item: "Mixed nuts", qty: "25g" },{ item: "Coconut flakes", qty: "10g" },{ item: "Blueberries", qty: "30g" }] },
    // ── VEGETARIAN ONLY ──
    { name: "Veggie Protein Smoothie Bowl", cal: 400, protein: 30, carbs: 45, fat: 10, tags: ["vegetarian"], health: ["low_sodium","low_sat_fat"], allergens: ["dairy","nuts"], recipe: "Blend 1 scoop whey protein, 1 frozen banana, 100g frozen berries, 150ml almond milk until thick. Top with 30g granola and 10g coconut. Under 4 mins.", ingredients: [{ item: "Whey protein powder", qty: "30g" },{ item: "Frozen banana", qty: "1" },{ item: "Frozen berries", qty: "100g" },{ item: "Almond milk", qty: "150ml" },{ item: "Granola", qty: "30g" },{ item: "Coconut flakes", qty: "10g" }] },
    // ── VEGAN ONLY ──
    { name: "Vegan Overnight Chia Pudding", cal: 340, protein: 12, carbs: 42, fat: 14, tags: ["vegan","vegetarian"], health: ["low_sodium","high_fibre","low_gi","low_sat_fat"], allergens: [], recipe: "Night before: Mix 40g chia seeds with 250ml coconut milk and 1 tbsp agave. Refrigerate overnight. Morning: top with 80g mango and passion fruit. Grab and go.", ingredients: [{ item: "Chia seeds", qty: "40g" },{ item: "Coconut milk", qty: "250ml" },{ item: "Agave syrup", qty: "1 tbsp" },{ item: "Mango", qty: "80g" },{ item: "Passion fruit", qty: "1" }] },
    { name: "Vegan PB & Banana Smoothie", cal: 380, protein: 20, carbs: 48, fat: 14, tags: ["vegan","vegetarian"], health: ["low_sodium","low_sat_fat"], allergens: ["nuts"], recipe: "Blend 1 frozen banana, 1 scoop vegan protein, 1 tbsp peanut butter, 250ml oat milk and a handful of spinach until smooth. Under 3 mins.", ingredients: [{ item: "Frozen banana", qty: "1" },{ item: "Vegan protein powder", qty: "30g" },{ item: "Peanut butter", qty: "1 tbsp" },{ item: "Oat milk", qty: "250ml" },{ item: "Spinach", qty: "30g" }] },
  ],
  lunch: [
    // ── MEAT / UNPROCESSED (no-restrictions) ──
    { name: "Grilled Chicken Caesar Salad", cal: 450, protein: 42, carbs: 15, fat: 25, tags: ["no-restrictions"], health: ["low_gi"], allergens: ["dairy","gluten","eggs"], recipe: "Grill 180g chicken breast with garlic & herbs. Toss romaine with light Caesar dressing, croutons, parmesan.", ingredients: [{ item: "Chicken breast", qty: "180g" },{ item: "Romaine lettuce", qty: "1 head" },{ item: "Light Caesar dressing", qty: "2 tbsp" },{ item: "Croutons", qty: "30g" },{ item: "Parmesan", qty: "20g" }] },
    { name: "Turkey & Quinoa Power Bowl", cal: 480, protein: 38, carbs: 50, fat: 14, tags: ["no-restrictions"], health: ["low_sodium","low_gi","high_fibre","low_sat_fat"], allergens: [], recipe: "Cook 80g quinoa. Pan-fry 180g turkey mince with spices. Assemble with black beans, corn, avocado, lime.", ingredients: [{ item: "Quinoa", qty: "80g" },{ item: "Turkey mince", qty: "180g" },{ item: "Black beans", qty: "60g" },{ item: "Sweet corn", qty: "50g" },{ item: "Avocado", qty: "1/2" },{ item: "Lime", qty: "1" }] },
    { name: "Tuna Nicoise Salad", cal: 430, protein: 38, carbs: 25, fat: 18, tags: ["no-restrictions"], health: ["low_sodium","low_sat_fat"], allergens: ["fish","eggs"], recipe: "Boil 2 eggs, 100g new potatoes. Arrange with tuna, green beans, tomatoes, olives. Dress with olive oil vinaigrette.", ingredients: [{ item: "Canned tuna (in spring water)", qty: "150g" },{ item: "Eggs", qty: "2" },{ item: "New potatoes", qty: "100g" },{ item: "Green beans", qty: "80g" },{ item: "Cherry tomatoes", qty: "80g" },{ item: "Black olives", qty: "30g" },{ item: "Olive oil", qty: "1 tbsp" }] },
    { name: "Salmon Poke Bowl", cal: 490, protein: 35, carbs: 50, fat: 16, tags: ["no-restrictions"], health: ["low_sat_fat"], allergens: ["fish","soy","sesame"], recipe: "Dice 150g salmon. Marinate in soy, sesame oil, rice vinegar. Serve over sushi rice with edamame, cucumber, avocado.", ingredients: [{ item: "Fresh salmon", qty: "150g" },{ item: "Sushi rice", qty: "120g" },{ item: "Soy sauce", qty: "2 tbsp" },{ item: "Sesame oil", qty: "1 tsp" },{ item: "Edamame", qty: "50g" },{ item: "Cucumber", qty: "1/2" },{ item: "Avocado", qty: "1/2" }] },
    { name: "Chicken & Avocado Wrap", cal: 470, protein: 36, carbs: 40, fat: 18, tags: ["no-restrictions"], health: ["low_sodium"], allergens: ["gluten"], recipe: "Slice 180g grilled chicken. Layer on wholegrain wrap with avocado, lettuce, tomato. Roll tightly.", ingredients: [{ item: "Chicken breast", qty: "180g" },{ item: "Wholegrain wrap", qty: "1" },{ item: "Avocado", qty: "1/2" },{ item: "Lettuce", qty: "handful" },{ item: "Tomato", qty: "1" }] },
    { name: "Lean Steak & Sweet Potato Bowl", cal: 500, protein: 40, carbs: 45, fat: 16, tags: ["no-restrictions"], health: ["low_sodium","low_gi","high_fibre","low_sat_fat"], allergens: [], recipe: "Grill 180g lean rump steak. Roast 150g sweet potato wedges. Serve with mixed leaf salad, cherry tomatoes, and balsamic dressing.", ingredients: [{ item: "Lean rump steak", qty: "180g" },{ item: "Sweet potato", qty: "150g" },{ item: "Mixed leaves", qty: "80g" },{ item: "Cherry tomatoes", qty: "80g" },{ item: "Balsamic vinegar", qty: "1 tbsp" },{ item: "Olive oil", qty: "1 tsp" }] },
    { name: "Grilled Chicken & Roasted Veg Salad", cal: 440, protein: 40, carbs: 25, fat: 20, tags: ["no-restrictions"], health: ["low_sodium","low_gi","low_sat_fat"], allergens: [], recipe: "Grill 180g chicken breast. Roast courgette, peppers, red onion with olive oil. Serve on a bed of rocket with lemon dressing.", ingredients: [{ item: "Chicken breast", qty: "180g" },{ item: "Courgette", qty: "1" },{ item: "Bell pepper", qty: "1" },{ item: "Red onion", qty: "1/2" },{ item: "Rocket", qty: "60g" },{ item: "Olive oil", qty: "1 tbsp" },{ item: "Lemon", qty: "1/2" }] },
    // ── PT:U EBOOK RECIPES (lunch) ──
    { name: "PT:U Tuna Roll Ups", cal: 419, protein: 27, carbs: 44, fat: 15, tags: ["no-restrictions"], health: ["low_sodium","low_sat_fat"], allergens: ["gluten","dairy","fish"], recipe: "From PT:U Recipe Book. Lay out 2 wholemeal wraps, spread cream cheese all over. Layer spinach, grated carrot, sliced cucumber and drained tuna. Roll tightly, slice each into three.", ingredients: [{ item: "Wholemeal wraps", qty: "2" },{ item: "Cream cheese", qty: "4 tbsp" },{ item: "Spinach", qty: "60g" },{ item: "Carrot (small)", qty: "1" },{ item: "Cucumber", qty: "1/4" },{ item: "Tinned tuna (spring water)", qty: "125g" }] },
    { name: "PT:U Salmon Mayo on Wholemeal", cal: 426, protein: 27, carbs: 30, fat: 22, tags: ["no-restrictions"], health: ["low_sat_fat"], allergens: ["gluten","fish","eggs"], recipe: "From PT:U Recipe Book. Poach 180g salmon in water with lemon juice. Flake with a fork, mix with 2 tbsp mayo and torn basil. Spread on wholemeal bread with rocket. Under 10 mins.", ingredients: [{ item: "Salmon fillets", qty: "180g" },{ item: "Lemon juice", qty: "1 tsp" },{ item: "Mayonnaise", qty: "2 tbsp" },{ item: "Fresh basil", qty: "1 tsp" },{ item: "Rocket", qty: "40g" },{ item: "Wholemeal bread", qty: "4 slices" }] },
    { name: "PT:U Halloumi Salad Bowl", cal: 492, protein: 33, carbs: 18, fat: 32, tags: ["vegetarian","no-restrictions"], health: ["low_gi","low_sodium"], allergens: ["dairy"], recipe: "From PT:U Recipe Book. Dry fry 112g halloumi until golden, drizzle with maple syrup. Toss romaine, cucumber, red onion, chickpeas, cherry tomatoes and olives. Top with halloumi.", ingredients: [{ item: "Halloumi", qty: "112g" },{ item: "Maple syrup", qty: "5g" },{ item: "Romaine lettuce", qty: "1/4 head" },{ item: "Cucumber", qty: "1/4" },{ item: "Red onion", qty: "1/4" },{ item: "Chickpeas", qty: "50g" },{ item: "Cherry tomatoes", qty: "5" },{ item: "Mixed olives", qty: "35g" }] },
    { name: "PT:U Chicken Nacho Traybake", cal: 595, protein: 49, carbs: 66, fat: 15, tags: ["no-restrictions"], health: ["low_sat_fat","low_sodium"], allergens: ["dairy"], recipe: "From PT:U Recipe Book. Toss 150g sliced chicken and 300g sweet potato chips with olive oil, tomato puree, cumin, paprika and garlic. Bake 180°C 30 mins. Top with spring onions and 30g cheddar, bake 6 more mins.", ingredients: [{ item: "Sweet potato", qty: "300g" },{ item: "Chicken breast", qty: "150g" },{ item: "Olive oil", qty: "1/2 tbsp" },{ item: "Tomato puree", qty: "5g" },{ item: "Cumin", qty: "1/2 tsp" },{ item: "Smoked paprika", qty: "1/2 tsp" },{ item: "Garlic", qty: "1 clove" },{ item: "Spring onions", qty: "2" },{ item: "Reduced fat cheddar", qty: "30g" }] },
    { name: "PT:U Thai Beef Salad", cal: 374, protein: 55, carbs: 7, fat: 14, tags: ["no-restrictions"], health: ["low_sodium","low_gi","low_sat_fat"], allergens: ["soy"], recipe: "From PT:U Recipe Book. Marinate 125g rump steak in olive oil, tamari and chilli flakes 10 mins. Griddle 3-4 mins each side. Rest 5 mins, slice. Serve over bell pepper, cucumber, carrot matchsticks and rocket.", ingredients: [{ item: "Beef rump steak", qty: "125g" },{ item: "Olive oil", qty: "1/2 tsp" },{ item: "Tamari", qty: "1/2 tbsp" },{ item: "Chilli flakes", qty: "1/2 tsp" },{ item: "Bell pepper", qty: "1/4" },{ item: "Cucumber", qty: "1/4" },{ item: "Carrot", qty: "1/4" },{ item: "Rocket", qty: "20g" }] },
    { name: "PT:U Beef & Sushi Rice Bowl", cal: 574, protein: 38, carbs: 65, fat: 18, tags: ["no-restrictions"], health: ["low_sat_fat"], allergens: ["soy"], recipe: "From PT:U Recipe Book. Cook 75g sushi rice. Fry 150g rump steak, rest and slice. Stir-fry pepper, red onion, cucumber and garlic with soy and rice wine vinegar. Toss with rice, mint and steak.", ingredients: [{ item: "Sushi rice", qty: "75g" },{ item: "Rump steak", qty: "150g" },{ item: "Olive oil", qty: "1/2 tbsp" },{ item: "Bell pepper", qty: "1/2" },{ item: "Red onion", qty: "1/4" },{ item: "Cucumber", qty: "1/4" },{ item: "Garlic", qty: "1 clove" },{ item: "Soy sauce", qty: "1/2 tsp" },{ item: "Rice wine vinegar", qty: "1 tsp" },{ item: "Mint leaves", qty: "12g" }] },
    // ── KETO ──
    { name: "Keto Chicken Lettuce Wraps", cal: 420, protein: 38, carbs: 6, fat: 26, tags: ["keto","no-restrictions"], health: ["low_gi"], allergens: ["soy"], recipe: "Cook 220g chicken mince with garlic, ginger, soy sauce, sesame oil. Spoon into lettuce cups. Top with spring onions.", ingredients: [{ item: "Chicken mince", qty: "220g" },{ item: "Butter lettuce", qty: "1 head" },{ item: "Garlic", qty: "2 cloves" },{ item: "Ginger", qty: "1 tsp" },{ item: "Soy sauce (reduced salt)", qty: "2 tbsp" },{ item: "Sesame oil", qty: "1 tsp" },{ item: "Spring onions", qty: "3" }] },
    { name: "Keto Beef Taco Bowl", cal: 460, protein: 38, carbs: 8, fat: 30, tags: ["keto","no-restrictions"], health: ["low_gi"], allergens: ["dairy"], recipe: "Brown 220g lean beef mince with taco seasoning. Serve over lettuce with sour cream, guacamole, cheese, salsa.", ingredients: [{ item: "Lean beef mince", qty: "220g" },{ item: "Taco seasoning", qty: "1 tbsp" },{ item: "Iceberg lettuce", qty: "1/2 head" },{ item: "Sour cream", qty: "2 tbsp" },{ item: "Avocado", qty: "1/2" },{ item: "Cheddar cheese", qty: "30g" },{ item: "Salsa", qty: "2 tbsp" }] },
    // ── VEGAN ONLY ──
    { name: "Mediterranean Lentil Soup", cal: 380, protein: 22, carbs: 55, fat: 8, tags: ["vegan","vegetarian"], health: ["low_sodium","high_fibre","low_gi","low_sat_fat"], allergens: [], recipe: "Sauté onion, carrot, celery. Add red lentils, tomatoes, stock, cumin, turmeric. Simmer 25 mins. Lemon to serve.", ingredients: [{ item: "Red lentils", qty: "120g" },{ item: "Onion", qty: "1" },{ item: "Carrot", qty: "2" },{ item: "Celery", qty: "2 sticks" },{ item: "Canned tomatoes", qty: "400g" },{ item: "Vegetable stock (low sodium)", qty: "500ml" },{ item: "Cumin", qty: "1 tsp" },{ item: "Turmeric", qty: "1/2 tsp" },{ item: "Lemon", qty: "1" }] },
    { name: "Vegan Chickpea & Spinach Wrap", cal: 420, protein: 18, carbs: 55, fat: 14, tags: ["vegan","vegetarian"], health: ["low_sodium","high_fibre","low_gi","low_sat_fat"], allergens: ["gluten","sesame"], recipe: "Mash chickpeas with tahini, lemon, cumin. Fill wholegrain wrap with chickpea mix, spinach, tomato, red onion.", ingredients: [{ item: "Chickpeas (canned)", qty: "200g" },{ item: "Tahini", qty: "1 tbsp" },{ item: "Lemon", qty: "1/2" },{ item: "Cumin", qty: "1/2 tsp" },{ item: "Wholegrain wrap", qty: "1" },{ item: "Spinach", qty: "50g" },{ item: "Tomato", qty: "1" },{ item: "Red onion", qty: "1/4" }] },
    { name: "Vegan Buddha Bowl", cal: 440, protein: 16, carbs: 58, fat: 18, tags: ["vegan","vegetarian"], health: ["low_sodium","high_fibre","low_gi","low_sat_fat"], allergens: ["soy"], recipe: "Roast sweet potato and chickpeas. Serve over quinoa with edamame, avocado, tahini dressing.", ingredients: [{ item: "Sweet potato", qty: "150g" },{ item: "Chickpeas", qty: "100g" },{ item: "Quinoa", qty: "80g" },{ item: "Edamame", qty: "50g" },{ item: "Avocado", qty: "1/2" },{ item: "Tahini", qty: "1 tbsp" },{ item: "Olive oil", qty: "1 tbsp" }] },
  ],
  dinner: [
    // ── MEAT / UNPROCESSED (no-restrictions) ──
    { name: "Herb-Crusted Salmon & Roasted Veg", cal: 500, protein: 40, carbs: 30, fat: 24, tags: ["no-restrictions"], health: ["low_sodium","low_sat_fat"], allergens: ["fish"], recipe: "Coat 200g salmon in parsley, garlic, lemon zest. Roast with broccoli, sweet potato, peppers at 200°C 20 mins.", ingredients: [{ item: "Salmon fillet", qty: "200g" },{ item: "Broccoli", qty: "150g" },{ item: "Sweet potato", qty: "150g" },{ item: "Bell pepper", qty: "1" },{ item: "Parsley", qty: "2 tbsp" },{ item: "Garlic", qty: "2 cloves" },{ item: "Lemon", qty: "1" },{ item: "Olive oil", qty: "1 tbsp" }] },
    { name: "Lean Beef Stir-Fry with Brown Rice", cal: 490, protein: 40, carbs: 48, fat: 15, tags: ["no-restrictions"], health: ["low_sodium","high_fibre","low_gi"], allergens: ["soy","sesame"], recipe: "Stir-fry 200g lean beef with broccoli, snap peas, carrots, garlic, ginger in reduced-salt soy. Serve over brown rice.", ingredients: [{ item: "Lean beef strips", qty: "200g" },{ item: "Broccoli", qty: "100g" },{ item: "Snap peas", qty: "80g" },{ item: "Carrots", qty: "1" },{ item: "Soy sauce (reduced salt)", qty: "2 tbsp" },{ item: "Brown rice", qty: "120g" }] },
    { name: "Chicken Tikka with Basmati", cal: 530, protein: 44, carbs: 45, fat: 18, tags: ["no-restrictions"], health: ["low_sodium"], allergens: ["dairy"], recipe: "Marinate 220g chicken in yogurt and tikka spices 30 mins. Grill. Simmer in tomato, onion, garlic sauce with light cream. Serve with basmati rice.", ingredients: [{ item: "Chicken breast", qty: "220g" },{ item: "Natural yogurt", qty: "50g" },{ item: "Tikka paste", qty: "2 tbsp" },{ item: "Onion", qty: "1" },{ item: "Canned tomatoes", qty: "200g" },{ item: "Light single cream", qty: "30ml" },{ item: "Basmati rice", qty: "120g" }] },
    { name: "Baked Cod with Lemon & Herbs", cal: 410, protein: 40, carbs: 30, fat: 12, tags: ["no-restrictions"], health: ["low_sodium","low_sat_fat","low_gi"], allergens: ["fish"], recipe: "Bake 200g cod on cherry tomatoes and olives. Drizzle olive oil, lemon, herbs. Serve with quinoa.", ingredients: [{ item: "Cod fillet", qty: "200g" },{ item: "Cherry tomatoes", qty: "100g" },{ item: "Olives", qty: "30g" },{ item: "Olive oil", qty: "1 tbsp" },{ item: "Lemon", qty: "1" },{ item: "Quinoa", qty: "80g" }] },
    { name: "Turkey Meatball Marinara", cal: 480, protein: 40, carbs: 48, fat: 14, tags: ["no-restrictions"], health: ["low_sodium","low_sat_fat"], allergens: ["gluten","eggs"], recipe: "Mix 220g turkey mince with breadcrumbs, egg, garlic, herbs. Bake meatballs. Simmer in marinara. Serve over wholegrain pasta.", ingredients: [{ item: "Turkey mince", qty: "220g" },{ item: "Breadcrumbs", qty: "30g" },{ item: "Egg", qty: "1" },{ item: "Marinara sauce", qty: "200g" },{ item: "Wholegrain spaghetti", qty: "100g" }] },
    { name: "Prawn & Veg Coconut Curry", cal: 460, protein: 34, carbs: 40, fat: 18, tags: ["no-restrictions"], health: ["low_sodium","low_sat_fat"], allergens: ["shellfish"], recipe: "Sauté onion, garlic, lemongrass. Add curry paste, coconut milk, prawns, courgette, baby corn. Simmer 10 mins. Serve over jasmine rice.", ingredients: [{ item: "King prawns", qty: "220g" },{ item: "Coconut milk (light)", qty: "200ml" },{ item: "Red curry paste", qty: "2 tbsp" },{ item: "Courgette", qty: "1" },{ item: "Baby corn", qty: "80g" },{ item: "Jasmine rice", qty: "120g" }] },
    { name: "Roast Chicken Thigh & Mediterranean Veg", cal: 520, protein: 38, carbs: 35, fat: 22, tags: ["no-restrictions"], health: ["low_sodium","low_sat_fat","low_gi"], allergens: [], recipe: "Roast 2 bone-in chicken thighs with skin removed. Roast courgette, aubergine, peppers, red onion with olive oil, garlic, rosemary at 200°C for 30 mins. Serve with 80g brown rice.", ingredients: [{ item: "Chicken thighs (skinless)", qty: "2" },{ item: "Courgette", qty: "1" },{ item: "Aubergine", qty: "1/2" },{ item: "Bell pepper", qty: "1" },{ item: "Red onion", qty: "1" },{ item: "Garlic", qty: "3 cloves" },{ item: "Rosemary", qty: "2 sprigs" },{ item: "Olive oil", qty: "1 tbsp" },{ item: "Brown rice", qty: "80g" }] },
    { name: "Grilled Lamb Chops & Roasted Roots", cal: 540, protein: 42, carbs: 35, fat: 24, tags: ["no-restrictions"], health: ["low_sodium","low_gi"], allergens: [], recipe: "Season 200g lamb loin chops with garlic, rosemary. Grill 4 mins each side. Roast parsnips, carrots, sweet potato at 200°C 25 mins. Serve with steamed green beans.", ingredients: [{ item: "Lamb loin chops", qty: "200g" },{ item: "Parsnip", qty: "1" },{ item: "Carrots", qty: "2" },{ item: "Sweet potato", qty: "100g" },{ item: "Green beans", qty: "80g" },{ item: "Garlic", qty: "2 cloves" },{ item: "Rosemary", qty: "2 sprigs" },{ item: "Olive oil", qty: "1 tbsp" }] },
    // ── PT:U EBOOK RECIPES (dinner) ──
    { name: "PT:U Honey Soy Salmon & Stir-Fried Greens", cal: 486, protein: 36, carbs: 9, fat: 34, tags: ["no-restrictions"], health: ["low_sodium","low_gi","low_sat_fat"], allergens: ["fish","soy"], recipe: "From PT:U Recipe Book. Marinate 150g salmon in honey, soy, ginger, garlic and chilli 30 mins. Roast 200°C 12-15 mins. Stir-fry asparagus and mangetout in olive oil 3 mins. Finish with balsamic and chives.", ingredients: [{ item: "Salmon fillet", qty: "150g" },{ item: "Honey", qty: "4g" },{ item: "Soy sauce", qty: "5ml" },{ item: "Ginger (ground)", qty: "1/4 tsp" },{ item: "Garlic", qty: "1/4 clove" },{ item: "Red chilli", qty: "1 slice" },{ item: "Asparagus", qty: "88g" },{ item: "Mangetout", qty: "63g" },{ item: "Olive oil", qty: "1 tbsp" },{ item: "Balsamic vinegar", qty: "1/4 tbsp" }] },
    { name: "PT:U Spatchcocked BBQ Chicken & Squash", cal: 511, protein: 41, carbs: 17, fat: 31, tags: ["no-restrictions"], health: ["low_sodium","low_gi"], allergens: [], recipe: "From PT:U Recipe Book. Season spatchcocked chicken with salt, pepper, garlic, cayenne, paprika. Roast 225°C 25 mins then 200°C 25 mins with butternut squash quarters. Rest 8 mins. Carve and serve.", ingredients: [{ item: "Chicken (spatchcocked, 1/4 of 1.25kg)", qty: "310g" },{ item: "Butternut squash", qty: "200g" },{ item: "Smoked paprika", qty: "1/4 tsp" },{ item: "Garlic powder", qty: "1/4 tsp" },{ item: "Cayenne pepper", qty: "1/4 tsp" },{ item: "Olive oil", qty: "1/4 tbsp" }] },
    { name: "PT:U Chicken Curry & Aromatic Rice", cal: 532, protein: 43, carbs: 63, fat: 12, tags: ["no-restrictions"], health: ["low_sodium","low_sat_fat"], allergens: ["dairy"], recipe: "From PT:U Recipe Book. Simmer 150g diced chicken with onion, ginger, half-fat crème fraîche, curry powder, cinnamon and raisins 30 mins. Cook 50g basmati rice with bay leaf and garlic. Serve together.", ingredients: [{ item: "Chicken breast (diced)", qty: "150g" },{ item: "Half-fat crème fraîche", qty: "60g" },{ item: "Onion", qty: "1/4" },{ item: "Ginger", qty: "1/2 inch" },{ item: "Curry powder", qty: "1/2 tsp" },{ item: "Cinnamon", qty: "1/8 tsp" },{ item: "Raisins", qty: "1/2 tbsp" },{ item: "Spinach", qty: "15g" },{ item: "Basmati rice", qty: "50g" },{ item: "Bay leaf", qty: "1/2" },{ item: "Garlic", qty: "1 clove" }] },
    { name: "PT:U Baked Tahini Chicken with Rice", cal: 566, protein: 41, carbs: 42, fat: 26, tags: ["no-restrictions"], health: ["low_sodium"], allergens: ["sesame"], recipe: "From PT:U Recipe Book. Marinate 150g chicken thighs in tahini, garlic, paprika, cumin, lemon juice and olive oil 1 hour. Roast 200°C 30-35 mins. Serve with 50g basmati rice and tahini drizzle.", ingredients: [{ item: "Chicken thighs (boneless)", qty: "150g" },{ item: "Tahini", qty: "25g" },{ item: "Garlic", qty: "1 clove" },{ item: "Paprika", qty: "1/2 tsp" },{ item: "Cumin", qty: "1/2 tsp" },{ item: "Lemon", qty: "1/4" },{ item: "Olive oil", qty: "1/2 tbsp" },{ item: "Basmati rice", qty: "50g" }] },
    { name: "PT:U Pesto Prawn Spaghetti", cal: 436, protein: 27, carbs: 46, fat: 16, tags: ["no-restrictions"], health: ["low_sodium","low_sat_fat"], allergens: ["gluten","shellfish"], recipe: "From PT:U Recipe Book. Roast 100g broccoli with olive oil 10 mins. Cook 50g spaghetti. Stir-fry 90g raw prawns with 20g pesto until pink. Toss with spaghetti, broccoli, lemon juice and diced red onion.", ingredients: [{ item: "Broccoli", qty: "100g" },{ item: "Olive oil", qty: "6g" },{ item: "Spaghetti", qty: "50g" },{ item: "Lemon juice", qty: "1/2 lemon" },{ item: "Honey", qty: "1/2 tsp" },{ item: "Red onion", qty: "15g" },{ item: "Raw prawns", qty: "90g" },{ item: "Pesto", qty: "20g" }] },
    { name: "PT:U Baked Lasagne", cal: 416, protein: 47, carbs: 30, fat: 12, tags: ["no-restrictions"], health: ["low_sat_fat"], allergens: ["dairy","gluten"], recipe: "From PT:U Recipe Book. Brown 125g 5% beef mince with onion, carrot, celery. Add tomato purée and chopped tomatoes, simmer. Make cheese sauce with milk, cornflour, soft cheese and cheddar. Layer with butternut squash sheets. Bake 200°C 35-40 mins.", ingredients: [{ item: "5% beef mince", qty: "125g" },{ item: "Onion", qty: "1/4" },{ item: "Carrot", qty: "1/4" },{ item: "Celery", qty: "1/4 stick" },{ item: "Chopped tomatoes", qty: "200g" },{ item: "Skimmed milk", qty: "88ml" },{ item: "Low-fat soft cheese", qty: "63g" },{ item: "Mature cheddar", qty: "19g" },{ item: "Butternut squash", qty: "75g" }] },
    { name: "PT:U Egg Fried Rice & Hot Prawns", cal: 480, protein: 36, carbs: 48, fat: 16, tags: ["no-restrictions"], health: ["low_sat_fat"], allergens: ["shellfish","soy","eggs"], recipe: "From PT:U Recipe Book. Stir-fry ginger, garlic, chilli and spring onions. Add bok choy and 125g rice. Scramble 1 egg through the rice with soy. In a separate pan, cook 150g prawns in chilli oil and soy. Serve together.", ingredients: [{ item: "Microwaveable rice", qty: "125g" },{ item: "Ginger", qty: "8g" },{ item: "Garlic", qty: "1 clove" },{ item: "Red chilli", qty: "1/4" },{ item: "Spring onions", qty: "1" },{ item: "Bok choy", qty: "1/4" },{ item: "Egg", qty: "1" },{ item: "Soy sauce", qty: "1/2 tsp" },{ item: "Chilli oil", qty: "1/2 tsp" },{ item: "Raw prawns", qty: "150g" }] },
    { name: "PT:U Rolled Turkey with Goats Cheese & Cranberry", cal: 218, protein: 34, carbs: 7, fat: 6, tags: ["no-restrictions"], health: ["low_sodium","low_gi","low_sat_fat"], allergens: ["dairy"], recipe: "From PT:U Recipe Book. Flatten 125g turkey breast to 1cm thick. Spread with goats cheese, add sautéed spinach. Roll and tie. Roast 200°C 40 mins. Simmer cranberries with OJ and honey for sauce. Rest, slice and serve.", ingredients: [{ item: "Turkey breast", qty: "125g" },{ item: "Goats cheese", qty: "12g" },{ item: "Spinach", qty: "30g" },{ item: "Frozen cranberries", qty: "50g" },{ item: "Orange juice", qty: "1/4 orange" },{ item: "Honey", qty: "5g" }] },
    { name: "PT:U Dijon Baked Salmon", cal: 363, protein: 37, carbs: 1, fat: 23, tags: ["no-restrictions"], health: ["low_sodium","low_gi","low_sat_fat"], allergens: ["fish"], recipe: "From PT:U Recipe Book. Place salmon fillet skin-side down on lined tray. Mix parsley, lemon juice, Dijon mustard, olive oil, salt and pepper. Spread over salmon, top with lemon slices. Bake 220°C 12-15 mins. Serve with green salad.", ingredients: [{ item: "Salmon fillet", qty: "1 large" },{ item: "Fresh parsley", qty: "1/2 tbsp" },{ item: "Lemon juice", qty: "1/2 tbsp" },{ item: "Dijon mustard", qty: "1 tsp" },{ item: "Olive oil", qty: "1/2 tsp" },{ item: "Lemon slices", qty: "2" }] },
    { name: "PT:U Red Curry Chicken with Noodles", cal: 413, protein: 20, carbs: 30, fat: 24, tags: ["no-restrictions"], health: ["low_sodium"], allergens: ["soy"], recipe: "From PT:U Recipe Book. Cook 75g rice noodles. Fry 1 chicken thigh in olive oil with honey until golden (15 mins). Simmer curry sauce: red curry paste, garlic, spring onion, chicken stock and coconut milk 5 mins. Serve over noodles.", ingredients: [{ item: "Rice noodles", qty: "75g" },{ item: "Chicken thigh", qty: "1" },{ item: "Olive oil", qty: "1/4 tbsp" },{ item: "Honey", qty: "1/2 tbsp" },{ item: "Red curry paste", qty: "1/2 tbsp" },{ item: "Garlic", qty: "1/4 clove" },{ item: "Spring onion", qty: "1" },{ item: "Chicken stock", qty: "31ml" },{ item: "Coconut milk", qty: "50ml" }] },
    // ── KETO ──
    { name: "Keto Garlic Butter Steak & Asparagus", cal: 560, protein: 45, carbs: 5, fat: 40, tags: ["keto","no-restrictions"], health: ["low_gi"], allergens: ["dairy"], recipe: "Pan-sear 220g sirloin steak. Cook asparagus in garlic butter with thyme. Rest steak 5 mins before slicing.", ingredients: [{ item: "Sirloin steak", qty: "220g" },{ item: "Asparagus", qty: "200g" },{ item: "Butter", qty: "25g" },{ item: "Garlic", qty: "3 cloves" },{ item: "Fresh thyme", qty: "2 sprigs" }] },
    { name: "Keto Creamy Tuscan Chicken", cal: 530, protein: 42, carbs: 6, fat: 38, tags: ["keto","no-restrictions"], health: ["low_gi"], allergens: ["dairy"], recipe: "Pan-fry 220g chicken. Cook garlic, sun-dried tomatoes, spinach. Add cream and parmesan. Return chicken. Serve with cauliflower mash.", ingredients: [{ item: "Chicken breast", qty: "220g" },{ item: "Sun-dried tomatoes", qty: "30g" },{ item: "Spinach", qty: "100g" },{ item: "Double cream", qty: "60ml" },{ item: "Parmesan", qty: "25g" },{ item: "Cauliflower", qty: "200g" }] },
    // ── VEGAN ONLY ──
    { name: "Vegan Chickpea Curry", cal: 450, protein: 18, carbs: 60, fat: 14, tags: ["vegan","vegetarian"], health: ["low_sodium","high_fibre","low_gi","low_sat_fat"], allergens: [], recipe: "Sauté onion, garlic, ginger. Add curry powder, cumin, turmeric, chickpeas, coconut milk, spinach. Simmer 20 mins. Serve with brown rice.", ingredients: [{ item: "Chickpeas (canned)", qty: "400g" },{ item: "Coconut milk (light)", qty: "200ml" },{ item: "Onion", qty: "1" },{ item: "Garlic", qty: "3 cloves" },{ item: "Ginger", qty: "1 tbsp" },{ item: "Spinach", qty: "100g" },{ item: "Curry powder", qty: "2 tbsp" },{ item: "Brown rice", qty: "120g" }] },
    { name: "Vegan Lentil Bolognese", cal: 440, protein: 22, carbs: 60, fat: 10, tags: ["vegan","vegetarian"], health: ["low_sodium","high_fibre","low_gi","low_sat_fat"], allergens: ["gluten"], recipe: "Cook 120g puy lentils. Sauté onion, garlic, carrot, celery. Add tomatoes and lentils. Simmer 20 mins. Serve over wholegrain spaghetti.", ingredients: [{ item: "Puy lentils", qty: "120g" },{ item: "Onion", qty: "1" },{ item: "Garlic", qty: "2 cloves" },{ item: "Carrot", qty: "1" },{ item: "Celery", qty: "1 stick" },{ item: "Canned tomatoes", qty: "400g" },{ item: "Wholegrain spaghetti", qty: "100g" }] },
  ],
  snack: [
    // ── UNPROCESSED / HIGH PROTEIN (no-restrictions) ──
    { name: "Boiled Eggs & Cherry Tomatoes", cal: 150, protein: 13, carbs: 5, fat: 9, tags: ["no-restrictions","keto"], health: ["low_sodium","low_gi"], allergens: ["eggs"], recipe: "Boil 2 eggs 8 mins. Serve with cherry tomatoes.", ingredients: [{ item: "Eggs", qty: "2" },{ item: "Cherry tomatoes", qty: "80g" }] },
    { name: "Cottage Cheese & Berries", cal: 160, protein: 18, carbs: 15, fat: 4, tags: ["no-restrictions"], health: ["low_sodium","low_gi","low_sat_fat"], allergens: ["dairy"], recipe: "Top 150g cottage cheese with 80g mixed berries.", ingredients: [{ item: "Cottage cheese", qty: "150g" },{ item: "Mixed berries", qty: "80g" }] },
    { name: "Greek Yogurt & Walnuts", cal: 200, protein: 16, carbs: 12, fat: 10, tags: ["no-restrictions"], health: ["low_sodium","low_gi","low_sat_fat"], allergens: ["dairy","nuts"], recipe: "Top 150g Greek yogurt with 20g crushed walnuts and a drizzle of honey.", ingredients: [{ item: "Greek yogurt", qty: "150g" },{ item: "Walnuts", qty: "20g" },{ item: "Honey", qty: "1 tsp" }] },
    { name: "Turkey & Cucumber Roll-Ups", cal: 140, protein: 18, carbs: 4, fat: 6, tags: ["no-restrictions"], health: ["low_sodium","low_gi","low_sat_fat"], allergens: [], recipe: "Wrap 80g sliced turkey breast around cucumber sticks with a smear of mustard.", ingredients: [{ item: "Sliced turkey breast", qty: "80g" },{ item: "Cucumber", qty: "1/2" },{ item: "Wholegrain mustard", qty: "1 tsp" }] },
    { name: "Protein Energy Balls", cal: 180, protein: 12, carbs: 20, fat: 8, tags: ["no-restrictions"], health: ["low_sodium"], allergens: ["nuts","dairy"], recipe: "Mix 100g oats, 60g whey protein, 3 tbsp peanut butter, 2 tbsp honey. Roll into 8 balls. Refrigerate.", ingredients: [{ item: "Rolled oats", qty: "100g" },{ item: "Whey protein powder", qty: "60g" },{ item: "Peanut butter", qty: "3 tbsp" },{ item: "Honey", qty: "2 tbsp" }] },
    { name: "Beef Jerky & Mixed Nuts", cal: 210, protein: 20, carbs: 8, fat: 12, tags: ["no-restrictions","keto"], health: ["low_gi"], allergens: ["nuts"], recipe: "Serve 50g lean beef jerky with 20g mixed nuts.", ingredients: [{ item: "Lean beef jerky", qty: "50g" },{ item: "Mixed nuts", qty: "20g" }] },
    // ── KETO ──
    { name: "Keto Cheese & Nuts", cal: 220, protein: 12, carbs: 3, fat: 18, tags: ["keto","no-restrictions"], health: ["low_gi"], allergens: ["dairy","nuts"], recipe: "Serve 40g mixed cheese cubes with 25g mixed nuts.", ingredients: [{ item: "Mixed cheese", qty: "40g" },{ item: "Mixed nuts", qty: "25g" }] },
    // ── VEGAN ONLY ──
    { name: "Hummus & Veggie Sticks", cal: 170, protein: 6, carbs: 22, fat: 7, tags: ["vegan","vegetarian"], health: ["low_sodium","high_fibre","low_gi","low_sat_fat"], allergens: ["sesame"], recipe: "Serve 60g hummus with carrot, cucumber, and pepper sticks.", ingredients: [{ item: "Hummus", qty: "60g" },{ item: "Carrots", qty: "1" },{ item: "Cucumber", qty: "1/2" },{ item: "Bell pepper", qty: "1" }] },
    { name: "Vegan Edamame & Seeds", cal: 190, protein: 14, carbs: 12, fat: 10, tags: ["vegan","vegetarian"], health: ["low_sodium","low_gi","low_sat_fat","high_fibre"], allergens: ["soy"], recipe: "Steam 100g edamame. Toss with pumpkin seeds and a squeeze of lime.", ingredients: [{ item: "Edamame", qty: "100g" },{ item: "Pumpkin seeds", qty: "15g" },{ item: "Lime", qty: "1/2" }] },
    { name: "Rice Cakes with Avocado", cal: 180, protein: 4, carbs: 22, fat: 10, tags: ["vegan","vegetarian"], health: ["low_sodium","low_sat_fat"], allergens: [], recipe: "Top 2 rice cakes with mashed avocado, chilli flakes, and lime juice.", ingredients: [{ item: "Rice cakes", qty: "2" },{ item: "Avocado", qty: "1/2" },{ item: "Lime", qty: "1/2" },{ item: "Chilli flakes", qty: "pinch" }] },
    { name: "Apple & Almond Butter", cal: 200, protein: 5, carbs: 25, fat: 10, tags: ["vegan","vegetarian"], health: ["low_sodium","low_gi","low_sat_fat"], allergens: ["nuts"], recipe: "Slice 1 apple. Serve with 1.5 tbsp almond butter.", ingredients: [{ item: "Apple", qty: "1" },{ item: "Almond butter", qty: "1.5 tbsp" }] },
  ],
};

// ─── CALC FUNCTIONS ──────────────────────────────────────────────
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
    portionScale: m,
    ingredients: meal.ingredients.map(ing => ({
      ...ing,
      qty: scaleQty(ing.qty, m),
      qtyOriginal: ing.qty,
    })),
  };
}

// ─── MEAL PLAN GENERATOR ─────────────────────────────────────────
function generateMealPlan(targetCal, proteinTarget, mealsPerDay, diet, allergens, conditions) {
  const needsLowSodium = conditions.includes("high_bp");
  const needsLowGI = conditions.includes("type2_diabetes");
  const needsLowSatFat = conditions.includes("high_chol");
  const needsHighFibre = conditions.includes("type2_diabetes") || conditions.includes("high_chol");

  const filterMeals = (meals) => {
    return meals.filter(m => {
      const dietMatch = diet === "no-restrictions" || m.tags.includes(diet);
      const allergenFree = !m.allergens.some(a => allergens.includes(a));
      let healthOk = true;
      if (needsLowSodium && !m.health.includes("low_sodium")) healthOk = false;
      if (needsLowGI && !m.health.includes("low_gi")) healthOk = false;
      if (needsLowSatFat && !m.health.includes("low_sat_fat")) healthOk = false;
      return dietMatch && allergenFree && healthOk;
    }).sort((a, b) => {
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

  const plan = [];
  const usedMeals = { breakfast: [], lunch: [], dinner: [], snack: [] };

  for (let day = 0; day < 5; day++) {
    // Pick a meal from filtered options, avoiding repeats where possible,
    // then scale its portions to hit the calorie target for that slot
    const pickAndScale = (arr, slotCalTarget, slotKey) => {
      if (arr.length === 0) return null;

      // Try to pick one we haven't used yet for variety
      let candidates = arr.filter(m => !usedMeals[slotKey].includes(m.name));
      if (candidates.length === 0) candidates = arr; // all used, allow repeats

      // Find the meal whose BASE calories are closest (least extreme scaling)
      candidates.sort((a, b) => Math.abs(a.cal - slotCalTarget) - Math.abs(b.cal - slotCalTarget));
      const chosen = candidates[0];
      usedMeals[slotKey].push(chosen.name);

      // Calculate the portion multiplier to hit the slot calorie target
      const multiplier = slotCalTarget / chosen.cal;
      return scaleMeal(chosen, multiplier);
    };

    const dayMeals = {};
    const bfTarget = Math.round(targetCal * calSplit.bf);
    const luTarget = Math.round(targetCal * calSplit.lu);
    const diTarget = Math.round(targetCal * calSplit.di);
    const snTarget = mealsPerDay === 4 ? Math.round(targetCal * calSplit.sn) : 0;

    dayMeals.breakfast = pickAndScale(bfOpts, bfTarget, "breakfast");
    dayMeals.lunch = pickAndScale(luOpts, luTarget, "lunch");
    dayMeals.dinner = pickAndScale(diOpts, diTarget, "dinner");
    if (mealsPerDay === 4) dayMeals.snack = pickAndScale(snOpts, snTarget, "snack");

    const totalCal = Object.values(dayMeals).reduce((s, m) => s + (m ? m.cal : 0), 0);
    const totalProtein = Object.values(dayMeals).reduce((s, m) => s + (m ? m.protein : 0), 0);
    plan.push({ day: day + 1, meals: dayMeals, totalCal, totalProtein, healthNotes });
  }
  return plan;
}

function buildShoppingList(plan, people) {
  const items = {};
  plan.forEach(day => {
    Object.values(day.meals).forEach(meal => {
      if (!meal) return;
      meal.ingredients.forEach(ing => {
        if (!items[ing.item]) items[ing.item] = [];
        items[ing.item].push(ing.qty);
      });
    });
  });
  return Object.entries(items).map(([item, qtys]) => ({ item, qty: qtys.join(" + "), multiply: people }));
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
export default function MealPlanner() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", email: "", healthGoal: "",
    age: "", gender: "male", weight: "", height: "", unit: "metric",
    activity: "moderate", goal: "fat_loss", diet: "no-restrictions",
    mealsPerDay: 3, people: 1, allergens: [], conditions: [],
  });
  const [plan, setPlan] = useState(null);
  const [showRecipe, setShowRecipe] = useState(null);
  const [generating, setGenerating] = useState(false);

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
  const proteinTarget = calcProteinTarget(Number(form.weight), form.unit, form.goal);
const saveLead = async () => {
    try {
      await fetch("https://script.google.com/macros/s/AKfycbxBa7zE3rzAbE3Gezt8-OIoifI1JTTZJqJ9fl-wxP9ELZPwMMFXUj71kL2uSdsFyTZ5/exec", {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, goal: form.healthGoal })
      });
    } catch(e) {}
  };
```

6. **Save the file**

---

## Part D — Push the update

Go back to Terminal (make sure you're in the `ptu-meal-planner-2` folder) and run:
```
git add .
git commit -m "Add email capture"
git push
  const doGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setPlan(generateMealPlan(target, proteinTarget, form.mealsPerDay, form.diet, form.allergens, form.conditions));
      setGenerating(false);
      setStep(6);
    }, 800);
  };

  const shoppingList = plan ? buildShoppingList(plan, form.people) : [];

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
      h += `<h2>Day ${day.day} <span style="font-weight:400;font-size:13px;color:#888;">(${day.totalCal} kcal | ${day.totalProtein}g protein — Target: ${target} kcal)</span></h2>`;
      Object.entries(day.meals).forEach(([type, meal]) => {
        if (!meal) return;
        const scaleNote = meal.portionScale && meal.portionScale !== 1
          ? ` <span style="color:#8BC43F;font-size:11px;">(portions adjusted to ${Math.round(meal.portionScale * 100)}%)</span>` : "";
        h += `<div class="meal"><div class="meal-name">${type.charAt(0).toUpperCase()+type.slice(1)}: ${meal.name}${scaleNote}</div>`;
        h += `<div class="macros">${meal.cal} kcal | P: ${meal.protein}g | C: ${meal.carbs}g | F: ${meal.fat}g</div>`;
        h += `<div class="recipe"><strong>Recipe:</strong> ${meal.recipe}</div>`;
        h += `<div class="ingredients"><strong>Ingredients (adjusted to your calories):</strong> ${meal.ingredients.map(i => `${i.qty} ${i.item}`).join(', ')}</div></div>`;
      });
    });
    h += `<h2>🛒 Shopping List (×${form.people})</h2>`;
    h += `<table><tr><th>Item</th><th>Quantity (per person)</th><th>People</th></tr>`;
    shoppingList.forEach(s => { h += `<tr><td>${s.item}</td><td>${s.qty}</td><td>×${s.multiply}</td></tr>`; });
    h += `</table>`;
    h += `<div class="footer">Generated by PT:U Meal Planner | www.pt-u.co.uk<br/>Calorie estimates use the Mifflin-St Jeor equation. Health condition guidance based on peer-reviewed research (NCBI/PubMed). Always consult a healthcare professional for medical dietary needs.</div>`;
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
    if (step === 0) return form.name && form.email && form.healthGoal;
    if (step === 1) return form.age && form.weight && form.height;
    return true;
  };

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 560, margin: "0 auto", paddingTop: 16 }}>
        <div style={S.logo}>PT<span style={S.logoAccent}>:</span>U</div>
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
                <label style={S.label}>Units</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={S.btn(form.unit==="metric")} onClick={() => update("unit","metric")}>Metric</button>
                  <button style={S.btn(form.unit==="imperial")} onClick={() => update("unit","imperial")}>Imperial</button>
                </div>
              </div>
            </div>
            <div style={S.row}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Age</label>
                <input style={S.input} type="number" placeholder="25" value={form.age} onChange={e => update("age", e.target.value)} />
              </div>
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
                <label style={S.label}>Weight ({form.unit==="metric" ? "kg" : "lbs"})</label>
                <input style={S.input} type="number" placeholder={form.unit==="metric"?"75":"165"} value={form.weight} onChange={e => update("weight", e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Height ({form.unit==="metric" ? "cm" : "in"})</label>
                <input style={S.input} type="number" placeholder={form.unit==="metric"?"175":"69"} value={form.height} onChange={e => update("height", e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Activity Level</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[["sedentary","Sedentary"],["light","Light"],["moderate","Moderate"],["active","Active"],["very_active","Very Active"]].map(([v,l]) => (
                  <button key={v} style={{ ...S.btn(form.activity===v), flex: "none", padding: "10px 14px" }} onClick={() => update("activity",v)}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={S.secondary} onClick={() => setStep(0)}>← Back</button>
              <button style={{ ...S.primary, opacity: canNext() ? 1 : 0.4 }} disabled={!canNext()} onClick={() => setStep(2)}>Continue →</button>
            </div>
          </div>)}

          {/* ── STEP 2: GOAL & CALORIES ── */}
          {step === 2 && (<div>
            <div style={S.greenBanner}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: C.greyMid, fontWeight: 600 }}>Your Maintenance (TDEE)</div>
              <div style={{ fontSize: 38, fontWeight: 800, color: C.black }}>{tdee} <span style={{ fontSize: 15, fontWeight: 400 }}>kcal</span></div>
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
              <button style={S.btn(form.mealsPerDay===3)} onClick={() => update("mealsPerDay",3)}>3 Meals</button>
              <button style={S.btn(form.mealsPerDay===4)} onClick={() => update("mealsPerDay",4)}>4 Meals (+ Snack)</button>
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
            <div style={{ display: "flex", gap: 10 }}>
              <button style={S.secondary} onClick={() => setStep(4)}>← Back</button>
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
                    <span style={{ fontSize: 11, color: C.greyMid }}>{day.totalCal} kcal | {day.totalProtein}g protein</span>
                    {Math.abs(day.totalCal - target) <= target * 0.05
                      ? <div style={{ fontSize: 10, color: C.green, fontWeight: 600 }}>✓ On target</div>
                      : <div style={{ fontSize: 10, color: "#d97706", fontWeight: 600 }}>{day.totalCal < target ? "↓" : "↑"} {Math.abs(day.totalCal - target)} kcal {day.totalCal < target ? "under" : "over"}</div>
                    }
                  </div>
                </div>
                {Object.entries(day.meals).map(([type, meal]) => {
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
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: C.green }}>{meal.cal}</div>
                          <div style={{ fontSize: 10, color: C.greyMid }}>kcal</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: C.greyMid, marginTop: 3 }}>
                        P: {meal.protein}g &nbsp; C: {meal.carbs}g &nbsp; F: {meal.fat}g
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

            {/* SHOPPING LIST */}
            <div style={{ ...S.section, marginTop: 24, display: "flex", alignItems: "center", gap: 8 }}>
              🛒 Shopping List
              <span style={{ fontSize: 11, fontWeight: 400, color: C.greyMid }}>×{form.people} {form.people===1?"person":"people"}</span>
            </div>
            <div style={{ background: C.grey, borderRadius: 10, padding: 14 }}>
              {shoppingList.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < shoppingList.length - 1 ? `1px solid ${C.greyBorder}` : "none", fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{s.item}</span>
                  <span style={{ color: C.greyMid, fontSize: 12 }}>{s.qty} {form.people > 1 ? `×${s.multiply}` : ""}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button style={S.secondary} onClick={() => { setPlan(null); setStep(0); setShowRecipe(null); }}>Start Over</button>
              <button style={S.primary} onClick={handlePrint}>📄 Print / Save PDF</button>
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
