"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Flame,
  Beef,
  Wheat,
  Droplets,
  RefreshCw,
  ChefHat,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Apple,
} from "lucide-react";
import { logEventClient } from "@/lib/events";
import { BottomNav } from "@/components/bottom-nav";

type MacroInfo = {
  grams: number;
  calories: number;
};

type Calculations = {
  bmr: number;
  tdee: number;
  targetCalories: number;
  macros: {
    calories: number;
    protein: MacroInfo;
    carbs: MacroInfo;
    fat: MacroInfo;
  };
};

type Food = {
  item: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type Meal = {
  name: string;
  foods: Food[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
};

type DayPlan = {
  day: string;
  meals: Meal[];
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

type MealPlan = {
  days: DayPlan[];
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function NutritionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [calculations, setCalculations] = useState<Calculations | null>(null);
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);

        // Calculate macros
        const calcs = calculateMacros(profileData);
        setCalculations(calcs);
      }

      // Fetch meal plan
      const { data: mealPlanData } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (mealPlanData) {
        setMealPlan(mealPlanData.meals);
        if (mealPlanData.calculations) {
          setCalculations(mealPlanData.calculations);
        }
      }

      setLoading(false);
      logEventClient("nutrition_plan_viewed", {});
    };

    loadData();
  }, [supabase, router]);

  const calculateMacros = (profile: any): Calculations => {
    // BMR using Mifflin-St Jeor
    let bmr: number;
    if (profile.gender === "male") {
      bmr =
        10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age + 5;
    } else {
      bmr =
        10 * profile.weight_kg +
        6.25 * profile.height_cm -
        5 * profile.age -
        161;
    }

    // Activity multiplier
    const multipliers: { [key: string]: number } = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    const tdee = Math.round(
      bmr * (multipliers[profile.activity_level] || 1.55),
    );

    // Goal adjustment
    let targetCalories = tdee;
    const goal = (profile.fitness_goal || "").toLowerCase();
    if (goal.includes("lose") || goal.includes("weight loss")) {
      targetCalories = tdee - 500;
    } else if (
      goal.includes("build") ||
      goal.includes("muscle") ||
      goal.includes("bulk")
    ) {
      targetCalories = tdee + 300;
    }

    // Macro split
    const proteinGrams = Math.round(profile.weight_kg * 2);
    const fatGrams = Math.round((targetCalories * 0.25) / 9);
    const carbGrams = Math.round(
      (targetCalories - proteinGrams * 4 - fatGrams * 9) / 4,
    );

    return {
      bmr: Math.round(bmr),
      tdee,
      targetCalories: Math.round(targetCalories),
      macros: {
        calories: Math.round(targetCalories),
        protein: { grams: proteinGrams, calories: proteinGrams * 4 },
        carbs: { grams: carbGrams, calories: carbGrams * 4 },
        fat: { grams: fatGrams, calories: fatGrams * 9 },
      },
    };
  };

  const handleGenerateMealPlan = async () => {
    if (!userId) return;
    setGenerating(true);

    try {
      const response = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success && data.mealPlan) {
        setMealPlan(data.mealPlan);
        logEventClient("nutrition_plan_generated", {
          target_calories: calculations?.targetCalories,
        });
      }
    } catch (error) {
      console.error("Failed to generate meal plan:", error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center animate-pulse">
            <Apple className="h-7 w-7 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
        </div>
      </div>
    );
  }

  const macros = calculations?.macros;
  const currentDayPlan = mealPlan?.days?.find((d) => d.day === selectedDay);

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800/50">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-white">Nutrition</h1>
          <p className="text-sm text-slate-400">Your daily macro targets</p>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Calorie Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 p-6">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="h-5 w-5 text-white" />
              <span className="text-white/80 text-sm font-medium">
                Daily Target
              </span>
            </div>

            <div className="text-center mb-6">
              <p className="text-5xl font-bold text-white">
                {macros?.calories || 0}
              </p>
              <p className="text-white/70 text-sm mt-1">calories per day</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
                <Beef className="h-5 w-5 mx-auto mb-1 text-white" />
                <p className="text-xl font-bold text-white">
                  {macros?.protein.grams || 0}g
                </p>
                <p className="text-xs text-white/70">Protein</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
                <Wheat className="h-5 w-5 mx-auto mb-1 text-white" />
                <p className="text-xl font-bold text-white">
                  {macros?.carbs.grams || 0}g
                </p>
                <p className="text-xs text-white/70">Carbs</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
                <Droplets className="h-5 w-5 mx-auto mb-1 text-white" />
                <p className="text-xl font-bold text-white">
                  {macros?.fat.grams || 0}g
                </p>
                <p className="text-xs text-white/70">Fat</p>
              </div>
            </div>
          </div>
        </div>

        {/* How It's Calculated */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">
            How it's calculated
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">BMR (Basal Metabolic Rate)</span>
              <span className="text-white font-medium">
                {calculations?.bmr || 0} kcal
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">
                TDEE ({profile?.activity_level || "moderate"})
              </span>
              <span className="text-white font-medium">
                {calculations?.tdee || 0} kcal
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">
                Goal ({profile?.fitness_goal || "maintain"})
              </span>
              <span className="text-orange-400 font-medium">
                {calculations?.targetCalories || 0} kcal
              </span>
            </div>
          </div>
        </div>

        {/* Meal Plan Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Meal Plan</h2>
            <Button
              size="sm"
              onClick={handleGenerateMealPlan}
              disabled={generating}
              className="bg-orange-600 hover:bg-orange-500 text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Generating...
                </>
              ) : mealPlan ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Regenerate
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Generate
                </>
              )}
            </Button>
          </div>

          {!mealPlan ? (
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <ChefHat className="h-8 w-8 text-orange-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">
                No Meal Plan Yet
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Generate a personalized meal plan based on your goals and
                preferences.
              </p>
              <Button
                onClick={handleGenerateMealPlan}
                disabled={generating}
                className="bg-orange-600 hover:bg-orange-500"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate Meal Plan
              </Button>
            </div>
          ) : (
            <>
              {/* Day Selector */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedDay === day
                        ? "bg-orange-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>

              {/* Meals for Selected Day */}
              {currentDayPlan ? (
                <div className="space-y-3">
                  {currentDayPlan.meals.map((meal, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedMeal(
                            expandedMeal === meal.name ? null : meal.name,
                          )
                        }
                        className="w-full p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                            <ChefHat className="h-5 w-5 text-orange-400" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-white">
                              {meal.name}
                            </p>
                            <p className="text-sm text-slate-400">
                              {meal.totalCalories} kcal
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right text-xs text-slate-500">
                            <span className="text-orange-400">
                              {meal.totalProtein}g P
                            </span>
                            {" · "}
                            <span>{meal.totalCarbs}g C</span>
                            {" · "}
                            <span>{meal.totalFat}g F</span>
                          </div>
                          <ChevronDown
                            className={`h-5 w-5 text-slate-500 transition-transform ${expandedMeal === meal.name ? "rotate-180" : ""}`}
                          />
                        </div>
                      </button>

                      {expandedMeal === meal.name && (
                        <div className="px-4 pb-4 space-y-2">
                          {meal.foods.map((food, foodIdx) => (
                            <div
                              key={foodIdx}
                              className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl"
                            >
                              <div>
                                <p className="text-sm text-white">
                                  {food.item}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {food.portion}
                                </p>
                              </div>
                              <p className="text-sm text-slate-400">
                                {food.calories} kcal
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Daily Totals */}
                  <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">
                        Daily Total
                      </span>
                      <div className="text-right">
                        <span className="text-white font-semibold">
                          {currentDayPlan.dailyTotals.calories} kcal
                        </span>
                        <p className="text-xs text-slate-500">
                          {currentDayPlan.dailyTotals.protein}g P ·{" "}
                          {currentDayPlan.dailyTotals.carbs}g C ·{" "}
                          {currentDayPlan.dailyTotals.fat}g F
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-2xl p-6 text-center">
                  <p className="text-slate-400">
                    No meals planned for {selectedDay}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tips */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">
            Quick Tips
          </h3>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-orange-400">•</span>
              Aim for {macros?.protein.grams || 0}g protein spread across your
              meals
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400">•</span>
              Drink at least 8 glasses of water daily
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400">•</span>
              Eat most carbs around your workouts
            </li>
          </ul>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
