import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Calculate BMR using Mifflin-St Jeor Equation
function calculateBMR(
  weight_kg: number,
  height_cm: number,
  age: number,
  gender: string,
): number {
  if (gender?.toLowerCase() === "male") {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  } else {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  }
}

// Activity level multipliers
const activityMultipliers: Record<string, number> = {
  sedentary: 1.2, // Little or no exercise
  light: 1.375, // Light exercise 1-3 days/week
  moderate: 1.55, // Moderate exercise 3-5 days/week
  active: 1.725, // Hard exercise 6-7 days/week
  very_active: 1.9, // Very hard exercise & physical job
};

// Calculate TDEE (Total Daily Energy Expenditure)
function calculateTDEE(bmr: number, activityLevel: string): number {
  const multiplier = activityMultipliers[activityLevel] || 1.55;
  return Math.round(bmr * multiplier);
}

// Calculate target calories based on goal
function calculateTargetCalories(tdee: number, goal: string): number {
  const goalLower = (goal || "").toLowerCase();

  // Check for weight loss keywords
  if (
    goalLower.includes("lose") ||
    goalLower.includes("cut") ||
    goalLower.includes("lean") ||
    goalLower.includes("fat loss") ||
    goalLower.includes("weight loss")
  ) {
    return Math.round(tdee * 0.8); // 20% deficit
  }

  // Check for muscle building keywords
  if (
    goalLower.includes("muscle") ||
    goalLower.includes("bulk") ||
    goalLower.includes("mass") ||
    goalLower.includes("gain") ||
    goalLower.includes("build")
  ) {
    return Math.round(tdee * 1.15); // 15% surplus for muscle building
  }

  // Check for strength keywords
  if (
    goalLower.includes("strength") ||
    goalLower.includes("strong") ||
    goalLower.includes("power")
  ) {
    return Math.round(tdee * 1.1); // 10% surplus for strength
  }

  // Default: maintenance
  return tdee;
}

// Calculate macros
function calculateMacros(
  targetCalories: number,
  weight_kg: number,
  goal: string,
) {
  // Protein: 2g per kg (minimum for muscle building/retention)
  const proteinGrams = Math.round(weight_kg * 2);
  const proteinCalories = proteinGrams * 4;

  // Fat: 25-30% of calories
  const fatCalories = Math.round(targetCalories * 0.25);
  const fatGrams = Math.round(fatCalories / 9);

  // Carbs: Remaining calories
  const carbCalories = targetCalories - proteinCalories - fatCalories;
  const carbGrams = Math.round(carbCalories / 4);

  return {
    calories: targetCalories,
    protein: { grams: proteinGrams, calories: proteinCalories },
    carbs: { grams: carbGrams, calories: carbCalories },
    fat: { grams: fatGrams, calories: fatCalories },
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get user profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Calculate nutrition info
    const bmr = calculateBMR(
      profile.weight_kg || 70,
      profile.height_cm || 170,
      profile.age || 30,
      profile.gender || "male",
    );

    const tdee = calculateTDEE(bmr, profile.activity_level || "moderate");
    const targetCalories = calculateTargetCalories(tdee, profile.fitness_goal);
    const macros = calculateMacros(
      targetCalories,
      profile.weight_kg || 70,
      profile.fitness_goal,
    );

    // Get existing meal plan if any
    const { data: mealPlan } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    return NextResponse.json({
      calculations: {
        bmr: Math.round(bmr),
        tdee,
        targetCalories,
        macros,
      },
      profile: {
        weight_kg: profile.weight_kg,
        height_cm: profile.height_cm,
        age: profile.age,
        gender: profile.gender,
        activity_level: profile.activity_level,
        fitness_goal: profile.fitness_goal,
        dietary_restrictions: profile.dietary_restrictions || [],
        food_allergies: profile.food_allergies || [],
        disliked_foods: profile.disliked_foods || [],
        meals_per_day: profile.meals_per_day || 3,
      },
      mealPlan: mealPlan?.meals || null,
    });
  } catch (error) {
    console.error("Nutrition GET error:", error);
    return NextResponse.json(
      { error: "Failed to get nutrition info" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    console.log("=== GENERATING MEAL PLAN ===");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get user profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Calculate macros
    const bmr = calculateBMR(
      profile.weight_kg || 70,
      profile.height_cm || 170,
      profile.age || 30,
      profile.gender || "male",
    );
    const tdee = calculateTDEE(bmr, profile.activity_level || "moderate");
    const targetCalories = calculateTargetCalories(tdee, profile.fitness_goal);
    const macros = calculateMacros(
      targetCalories,
      profile.weight_kg || 70,
      profile.fitness_goal,
    );

    const mealsPerDay = profile.meals_per_day || 3;

    const prompt = `Create a complete 7-day meal plan for this user.

MANDATORY NUTRITIONAL TARGETS (per day) - YOU MUST HIT THESE EXACTLY:
- Calories: EXACTLY ${macros.calories} kcal (NOT 2000, NOT 2500, EXACTLY ${macros.calories})
- Protein: ${macros.protein.grams}g
- Carbs: ${macros.carbs.grams}g
- Fat: ${macros.fat.grams}g

IMPORTANT: The daily calorie target is ${macros.calories} kcal. Each day's dailyTotals.calories MUST equal ${macros.calories} (within 50 calories).

USER PROFILE:
- Goal: ${profile.fitness_goal || "general fitness"}
- Meals per day: ${mealsPerDay}
- Dietary restrictions: ${profile.dietary_restrictions?.length > 0 ? profile.dietary_restrictions.join(", ") : "None"}
- Food allergies: ${profile.food_allergies?.length > 0 ? profile.food_allergies.join(", ") : "None"}
- Disliked foods: ${profile.disliked_foods?.length > 0 ? profile.disliked_foods.join(", ") : "None"}

CRITICAL REQUIREMENTS:
1. You MUST create EXACTLY 7 days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
2. Each day MUST have exactly ${mealsPerDay} meals
3. Each day MUST total ${macros.calories} calories (within 50 kcal) - THIS IS CRITICAL
4. NEVER include any foods from allergies list
5. NEVER include any disliked foods
6. Follow all dietary restrictions strictly
7. Include variety - don't repeat the same meals across days
8. Make meals practical and easy to prepare
9. Include portion sizes in grams or common measurements

Return a JSON object with this EXACT structure - ALL 7 DAYS REQUIRED:
{
  "days": [
    {
      "day": "Monday",
      "meals": [
        {
          "name": "Breakfast",
          "foods": [
            {
              "item": "Oatmeal with banana",
              "portion": "1 cup oats, 1 medium banana",
              "calories": 350,
              "protein": 12,
              "carbs": 60,
              "fat": 6
            }
          ],
          "totalCalories": 350,
          "totalProtein": 12,
          "totalCarbs": 60,
          "totalFat": 6
        }
      ],
      "dailyTotals": {
        "calories": ${macros.calories},
        "protein": ${macros.protein.grams},
        "carbs": ${macros.carbs.grams},
        "fat": ${macros.fat.grams}
      }
    },
    {
      "day": "Tuesday",
      "meals": [...],
      "dailyTotals": {"calories": ${macros.calories}, ...}
    },
    {
      "day": "Wednesday",
      "meals": [...],
      "dailyTotals": {"calories": ${macros.calories}, ...}
    },
    {
      "day": "Thursday",
      "meals": [...],
      "dailyTotals": {"calories": ${macros.calories}, ...}
    },
    {
      "day": "Friday",
      "meals": [...],
      "dailyTotals": {"calories": ${macros.calories}, ...}
    },
    {
      "day": "Saturday",
      "meals": [...],
      "dailyTotals": {"calories": ${macros.calories}, ...}
    },
    {
      "day": "Sunday",
      "meals": [...],
      "dailyTotals": {"calories": ${macros.calories}, ...}
    }
  ]
}

IMPORTANT: The "days" array MUST contain exactly 7 objects, one for each day of the week. Each day MUST total ${macros.calories} calories.
Return valid JSON only, no markdown.`;

    console.log("🍽️ Generating meal plan with AI...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert nutritionist creating personalized meal plans. Always return valid JSON with exactly 7 days (Monday through Sunday). Never truncate your response.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 8000,
      response_format: { type: "json_object" },
    });

    const mealPlanText = response.choices[0].message.content;

    if (!mealPlanText) {
      return NextResponse.json(
        { error: "Failed to generate meal plan" },
        { status: 500 },
      );
    }

    let mealPlanData;
    try {
      mealPlanData = JSON.parse(mealPlanText);
    } catch (e) {
      console.error("Failed to parse meal plan JSON:", e);
      return NextResponse.json(
        { error: "Invalid meal plan format" },
        { status: 500 },
      );
    }

    // Validate that all 7 days are present
    const requiredDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const existingDays = mealPlanData.days?.map((d: any) => d.day) || [];
    const missingDays = requiredDays.filter(
      (day) => !existingDays.includes(day),
    );

    if (missingDays.length > 0) {
      console.error("Missing days in meal plan:", missingDays);
      console.log("Existing days:", existingDays);
      return NextResponse.json(
        {
          error: `Meal plan incomplete. Missing: ${missingDays.join(", ")}. Please try again.`,
        },
        { status: 500 },
      );
    }

    // Validate and fix calorie totals for each day
    // If AI generated wrong totals, scale the meals to match target
    mealPlanData.days = mealPlanData.days.map((day: any) => {
      // Calculate actual totals from meals
      let actualCalories = 0;
      let actualProtein = 0;
      let actualCarbs = 0;
      let actualFat = 0;

      if (day.meals && Array.isArray(day.meals)) {
        day.meals.forEach((meal: any) => {
          actualCalories += meal.totalCalories || 0;
          actualProtein += meal.totalProtein || 0;
          actualCarbs += meal.totalCarbs || 0;
          actualFat += meal.totalFat || 0;
        });
      }

      // If totals are way off (more than 20% variance), scale the meals
      if (
        actualCalories > 0 &&
        Math.abs(actualCalories - macros.calories) / macros.calories > 0.2
      ) {
        const scaleFactor = macros.calories / actualCalories;
        console.log(
          `📊 Day ${day.day}: Scaling meals by ${scaleFactor.toFixed(2)} (${actualCalories} -> ${macros.calories})`,
        );

        day.meals = day.meals.map((meal: any) => {
          const scaledMeal = {
            ...meal,
            totalCalories: Math.round((meal.totalCalories || 0) * scaleFactor),
            totalProtein: Math.round((meal.totalProtein || 0) * scaleFactor),
            totalCarbs: Math.round((meal.totalCarbs || 0) * scaleFactor),
            totalFat: Math.round((meal.totalFat || 0) * scaleFactor),
          };

          // Also scale individual foods if present
          if (scaledMeal.foods && Array.isArray(scaledMeal.foods)) {
            scaledMeal.foods = scaledMeal.foods.map((food: any) => ({
              ...food,
              calories: Math.round((food.calories || 0) * scaleFactor),
              protein: Math.round((food.protein || 0) * scaleFactor),
              carbs: Math.round((food.carbs || 0) * scaleFactor),
              fat: Math.round((food.fat || 0) * scaleFactor),
            }));
          }

          return scaledMeal;
        });

        // Update daily totals
        actualCalories = Math.round(actualCalories * scaleFactor);
        actualProtein = Math.round(actualProtein * scaleFactor);
        actualCarbs = Math.round(actualCarbs * scaleFactor);
        actualFat = Math.round(actualFat * scaleFactor);
      }

      // Set correct daily totals
      day.dailyTotals = {
        calories: actualCalories || macros.calories,
        protein: actualProtein || macros.protein.grams,
        carbs: actualCarbs || macros.carbs.grams,
        fat: actualFat || macros.fat.grams,
      };

      return day;
    });

    console.log("✅ Meal plan generated with all 7 days, calories validated");
    console.log(
      `📊 Target: ${macros.calories} kcal | Goal: ${profile.fitness_goal}`,
    );

    // Deactivate old meal plans
    await supabase
      .from("meal_plans")
      .update({ is_active: false })
      .eq("user_id", userId);

    // Save new meal plan
    const { data: savedPlan, error: saveError } = await supabase
      .from("meal_plans")
      .insert([
        {
          user_id: userId,
          meals: mealPlanData,
          target_calories: macros.calories,
          target_protein: macros.protein.grams,
          target_carbs: macros.carbs.grams,
          target_fat: macros.fat.grams,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save meal plan:", saveError);
      // Return the plan anyway even if save fails
    }

    return NextResponse.json({
      success: true,
      mealPlan: mealPlanData,
      macros,
      planId: savedPlan?.id,
    });
  } catch (error) {
    console.error("Meal plan generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate meal plan" },
      { status: 500 },
    );
  }
}
