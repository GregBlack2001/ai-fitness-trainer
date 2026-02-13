"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Flame,
  Beef,
  Wheat,
  Droplets,
  RefreshCw,
  ChefHat,
  Calendar,
  Info,
  Apple,
  ArrowLeft,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { logEventClient } from "@/lib/events";

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

export default function NutritionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [calculations, setCalculations] = useState<Calculations | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState("Monday");

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

      try {
        const response = await fetch("/api/nutrition");
        const data = await response.json();

        if (data.calculations) {
          setCalculations(data.calculations);
        }
        if (data.profile) {
          setProfile(data.profile);
        }
        if (data.mealPlan) {
          setMealPlan(data.mealPlan);
          // Log nutrition plan viewed event
          logEventClient("nutrition_plan_viewed");
        }
      } catch (error) {
        console.error("Failed to load nutrition data:", error);
      }

      setLoading(false);
    };

    loadData();
  }, [supabase, router]);

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
        // Log nutrition plan generated event
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const macros = calculations?.macros;
  const currentDayPlan = mealPlan?.days?.find((d) => d.day === selectedDay);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Back button */}
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Nutrition</h1>
          <p className="text-muted-foreground">
            Your personalized macro targets and meal plans
          </p>
        </div>

        {/* Daily Targets Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-500/90 to-red-500 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Flame className="h-5 w-5" />
              Daily Targets
            </CardTitle>
            <CardDescription className="text-white/80">
              Based on your profile and {profile?.fitness_goal || "fitness"}{" "}
              goal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <p className="text-6xl font-bold">{macros?.calories || 0}</p>
              <p className="text-white/80">calories per day</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Protein */}
              <div className="bg-white/20 rounded-xl p-4 text-center">
                <Beef className="h-6 w-6 mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {macros?.protein.grams || 0}g
                </p>
                <p className="text-sm text-white/80">Protein</p>
              </div>

              {/* Carbs */}
              <div className="bg-white/20 rounded-xl p-4 text-center">
                <Wheat className="h-6 w-6 mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {macros?.carbs.grams || 0}g
                </p>
                <p className="text-sm text-white/80">Carbs</p>
              </div>

              {/* Fat */}
              <div className="bg-white/20 rounded-xl p-4 text-center">
                <Droplets className="h-6 w-6 mx-auto mb-2" />
                <p className="text-2xl font-bold">{macros?.fat.grams || 0}g</p>
                <p className="text-sm text-white/80">Fat</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It's Calculated */}
        <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" />
              How Your Targets Are Calculated
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Basal Metabolic Rate (BMR)
              </span>
              <span className="font-medium">{calculations?.bmr || 0} kcal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Activity Level ({profile?.activity_level || "moderate"})
              </span>
              <span className="font-medium">
                ×
                {(() => {
                  const multipliers: Record<string, string> = {
                    sedentary: "1.2",
                    light: "1.375",
                    moderate: "1.55",
                    active: "1.725",
                    very_active: "1.9",
                  };
                  return (
                    multipliers[profile?.activity_level as string] || "1.55"
                  );
                })()}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Maintenance Calories (TDEE)
              </span>
              <span className="font-medium">
                {calculations?.tdee || 0} kcal
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Goal Adjustment ({profile?.fitness_goal || "maintain"})
              </span>
              <span className="font-medium">
                {profile?.fitness_goal === "lose weight"
                  ? "-20%"
                  : profile?.fitness_goal === "build muscle"
                    ? "+10%"
                    : profile?.fitness_goal === "increase strength"
                      ? "+5%"
                      : "0%"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Daily Target</span>
              <span className="text-primary">{macros?.calories || 0} kcal</span>
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Protein:</strong> 2g per kg body weight (
                {profile?.weight_kg || 70}kg × 2 = {macros?.protein.grams || 0}
                g) — optimal for muscle building and retention.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dietary Info */}
        {(profile?.dietary_restrictions?.length > 0 ||
          profile?.food_allergies?.length > 0) && (
          <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-4 w-4" />
                Your Dietary Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile?.dietary_restrictions?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Dietary Restrictions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.dietary_restrictions.map((item: string) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile?.food_allergies?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Allergies
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.food_allergies.map((item: string) => (
                      <Badge key={item} variant="destructive">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile?.disliked_foods?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Disliked Foods
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.disliked_foods.map((item: string) => (
                      <Badge key={item} variant="outline">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Meal Plan Section */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  7-Day Meal Plan
                </CardTitle>
                <CardDescription>
                  Personalized meals to hit your macro targets
                </CardDescription>
              </div>
              <Button onClick={handleGenerateMealPlan} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : mealPlan ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Plan
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {mealPlan ? (
              <div className="space-y-4">
                {/* Day Selector */}
                <Tabs value={selectedDay} onValueChange={setSelectedDay}>
                  <TabsList className="grid grid-cols-7 h-auto">
                    {[
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                      "Sunday",
                    ].map((day) => (
                      <TabsTrigger
                        key={day}
                        value={day}
                        className="text-xs px-1 py-2"
                      >
                        {day.slice(0, 3)}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {mealPlan.days?.map((dayPlan) => (
                    <TabsContent
                      key={dayPlan.day}
                      value={dayPlan.day}
                      className="mt-4"
                    >
                      {/* Daily Summary */}
                      <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                        <div className="text-center">
                          <p className="text-lg font-bold">
                            {dayPlan.dailyTotals?.calories || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">kcal</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-red-500">
                            {dayPlan.dailyTotals?.protein || 0}g
                          </p>
                          <p className="text-xs text-muted-foreground">
                            protein
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-amber-500">
                            {dayPlan.dailyTotals?.carbs || 0}g
                          </p>
                          <p className="text-xs text-muted-foreground">carbs</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-500">
                            {dayPlan.dailyTotals?.fat || 0}g
                          </p>
                          <p className="text-xs text-muted-foreground">fat</p>
                        </div>
                      </div>

                      {/* Meals */}
                      <div className="space-y-4">
                        {dayPlan.meals?.map((meal, mealIndex) => (
                          <div
                            key={mealIndex}
                            className="border rounded-lg overflow-hidden"
                          >
                            <div className="bg-muted/30 px-4 py-2 flex items-center justify-between">
                              <h4 className="font-semibold">{meal.name}</h4>
                              <span className="text-sm text-muted-foreground">
                                {meal.totalCalories} kcal
                              </span>
                            </div>
                            <div className="p-4 space-y-3">
                              {meal.foods?.map((food, foodIndex) => (
                                <div
                                  key={foodIndex}
                                  className="flex items-start justify-between"
                                >
                                  <div>
                                    <p className="font-medium">{food.item}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {food.portion}
                                    </p>
                                  </div>
                                  <div className="text-right text-sm">
                                    <p>{food.calories} kcal</p>
                                    <p className="text-muted-foreground">
                                      P:{food.protein}g C:{food.carbs}g F:
                                      {food.fat}g
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="bg-muted/20 px-4 py-2 flex justify-end gap-4 text-xs">
                              <span className="text-red-500">
                                P: {meal.totalProtein}g
                              </span>
                              <span className="text-amber-500">
                                C: {meal.totalCarbs}g
                              </span>
                              <span className="text-blue-500">
                                F: {meal.totalFat}g
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            ) : (
              <div className="text-center py-12">
                <Apple className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No Meal Plan Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Generate a personalized 7-day meal plan based on your macro
                  targets
                </p>
                <Button onClick={handleGenerateMealPlan} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Meal Plan
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom spacer */}
        <div className="h-8" />
      </main>
    </div>
  );
}
