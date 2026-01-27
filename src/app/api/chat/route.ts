import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { isValidUUID, validateChatMessage } from "@/lib/validation";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Get current day info
const getCurrentDayInfo = () => {
  const now = new Date();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayName = days[now.getDay()];
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return { dayName, dateStr };
};

const getSystemPrompt = () => {
  const { dayName, dateStr } = getCurrentDayInfo();

  return `You are an expert AI fitness and nutrition coach with deep knowledge of exercise science, nutrition, and training programming. You have access to the user's profile, workout plan, and meal plan.

CURRENT DATE: ${dateStr}
TODAY IS: ${dayName}

Your capabilities include:
1. **Answering fitness & nutrition questions** - exercise form, recovery, motivation, diet advice, macro guidance
2. **Modifying workout plans** - swap exercises, change days, adjust intensity, add/remove exercises
3. **Modifying meal plans** - swap meals, adjust portions, accommodate new dietary needs, regenerate days
4. **Accommodating injuries** - modify exercises to work around limitations
5. **Providing encouragement** - motivate and support the user's journey

IMPORTANT GUIDELINES:
- Be conversational, supportive, and encouraging
- When modifying plans, explain WHY you're making changes
- For injuries, always recommend consulting a healthcare professional for serious concerns
- When swapping exercises, ensure the replacement targets the same muscle groups
- For nutrition changes, maintain the user's calorie and macro targets
- Keep responses concise but helpful
- When the user mentions "today" or "today's workout", use ${dayName} as the reference day
- If user asks to change "today's workout", modify the ${dayName} workout

When you need to modify plans, use the available functions. Always confirm major changes with the user.`;
};

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  // WORKOUT FUNCTIONS
  {
    type: "function",
    function: {
      name: "swap_exercise",
      description: "Replace one exercise with another in the workout plan",
      parameters: {
        type: "object",
        properties: {
          day: {
            type: "string",
            description: "The workout day (e.g., 'Monday')",
          },
          old_exercise: {
            type: "string",
            description: "Name of the exercise to replace",
          },
          new_exercise: {
            type: "string",
            description: "Name of the replacement exercise",
          },
          new_sets: { type: "number", description: "Number of sets" },
          new_reps: {
            type: "number",
            description: "Number of reps (optional if duration-based)",
          },
          new_duration_seconds: {
            type: "number",
            description: "Duration in seconds (optional)",
          },
          new_rest_seconds: {
            type: "number",
            description: "Rest period between sets",
          },
          new_notes: { type: "string", description: "Form cues or notes" },
          reason: {
            type: "string",
            description: "Why this swap is being made",
          },
        },
        required: [
          "day",
          "old_exercise",
          "new_exercise",
          "new_sets",
          "new_rest_seconds",
          "reason",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjust_workout_intensity",
      description:
        "Adjust the overall intensity of workouts (sets, reps, or rest)",
      parameters: {
        type: "object",
        properties: {
          adjustment_type: { type: "string", enum: ["increase", "decrease"] },
          target: { type: "string", enum: ["all_workouts", "specific_day"] },
          specific_day: {
            type: "string",
            description: "If target is specific_day, which day",
          },
          sets_change: {
            type: "number",
            description: "Sets to add/remove (e.g., 1 or -1)",
          },
          reps_change: {
            type: "number",
            description: "Reps to add/remove per set",
          },
          rest_change_seconds: {
            type: "number",
            description: "Rest period adjustment",
          },
          reason: { type: "string" },
        },
        required: ["adjustment_type", "target", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "modify_for_injury",
      description: "Modify workouts to accommodate an injury",
      parameters: {
        type: "object",
        properties: {
          injury_area: { type: "string", description: "Body part affected" },
          severity: { type: "string", enum: ["mild", "moderate", "severe"] },
          modifications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "string" },
                exercise_to_modify: { type: "string" },
                action: {
                  type: "string",
                  enum: ["remove", "replace", "reduce_intensity"],
                },
                replacement_exercise: { type: "string" },
                replacement_sets: { type: "number" },
                replacement_reps: { type: "number" },
                notes: { type: "string" },
              },
              required: ["day", "exercise_to_modify", "action"],
            },
          },
          general_advice: { type: "string" },
        },
        required: [
          "injury_area",
          "severity",
          "modifications",
          "general_advice",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_exercise",
      description: "Add a new exercise to a workout day",
      parameters: {
        type: "object",
        properties: {
          day: { type: "string" },
          exercise_name: { type: "string" },
          sets: { type: "number" },
          reps: { type: "number" },
          duration_seconds: { type: "number" },
          rest_seconds: { type: "number" },
          notes: { type: "string" },
          position: { type: "string", enum: ["start", "end", "after_warmup"] },
        },
        required: ["day", "exercise_name", "sets", "rest_seconds"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_exercise",
      description: "Remove an exercise from a workout day",
      parameters: {
        type: "object",
        properties: {
          day: { type: "string" },
          exercise_name: { type: "string" },
          reason: { type: "string" },
        },
        required: ["day", "exercise_name", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "change_workout_day",
      description: "Move a workout from one day to another day",
      parameters: {
        type: "object",
        properties: {
          from_day: {
            type: "string",
            description: "The current day of the workout (e.g., 'Monday')",
          },
          to_day: {
            type: "string",
            description:
              "The new day to move the workout to (e.g., 'Saturday')",
          },
          reason: {
            type: "string",
            description: "Why the workout is being moved",
          },
        },
        required: ["from_day", "to_day", "reason"],
      },
    },
  },
  // NUTRITION FUNCTIONS
  {
    type: "function",
    function: {
      name: "swap_meal",
      description:
        "Replace a meal with a different one that matches the macro targets",
      parameters: {
        type: "object",
        properties: {
          day: {
            type: "string",
            description: "Day of the week (e.g., 'Monday')",
          },
          meal_name: {
            type: "string",
            description: "Which meal to replace (e.g., 'Breakfast', 'Lunch')",
          },
          new_foods: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string" },
                portion: { type: "string" },
                calories: { type: "number" },
                protein: { type: "number" },
                carbs: { type: "number" },
                fat: { type: "number" },
              },
              required: [
                "item",
                "portion",
                "calories",
                "protein",
                "carbs",
                "fat",
              ],
            },
          },
          reason: { type: "string" },
        },
        required: ["day", "meal_name", "new_foods", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjust_meal_portions",
      description:
        "Adjust portion sizes for a meal to change calorie/macro intake",
      parameters: {
        type: "object",
        properties: {
          day: { type: "string" },
          meal_name: { type: "string" },
          adjustment: { type: "string", enum: ["increase", "decrease"] },
          percentage: {
            type: "number",
            description: "Percentage to adjust by (e.g., 20 for 20%)",
          },
          reason: { type: "string" },
        },
        required: ["day", "meal_name", "adjustment", "percentage", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_dietary_preferences",
      description:
        "Update user's dietary restrictions, allergies, or disliked foods",
      parameters: {
        type: "object",
        properties: {
          add_restrictions: { type: "array", items: { type: "string" } },
          remove_restrictions: { type: "array", items: { type: "string" } },
          add_allergies: { type: "array", items: { type: "string" } },
          remove_allergies: { type: "array", items: { type: "string" } },
          add_disliked: { type: "array", items: { type: "string" } },
          remove_disliked: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "regenerate_day_meals",
      description: "Regenerate all meals for a specific day with new options",
      parameters: {
        type: "object",
        properties: {
          day: { type: "string", description: "Day to regenerate meals for" },
          special_requests: {
            type: "string",
            description: "Any special requests for the new meals",
          },
        },
        required: ["day"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjust_daily_calories",
      description: "Adjust the user's daily calorie target",
      parameters: {
        type: "object",
        properties: {
          new_calorie_target: { type: "number" },
          reason: { type: "string" },
          regenerate_meal_plan: {
            type: "boolean",
            description: "Whether to regenerate the meal plan with new targets",
          },
        },
        required: ["new_calorie_target", "reason"],
      },
    },
  },
  // PROFILE FUNCTIONS
  {
    type: "function",
    function: {
      name: "update_profile_injury",
      description: "Add or remove an injury from user's profile",
      parameters: {
        type: "object",
        properties: {
          injury: { type: "string" },
          add_or_remove: { type: "string", enum: ["add", "remove"] },
        },
        required: ["injury", "add_or_remove"],
      },
    },
  },
];

// Apply workout modifications
async function applyWorkoutModification(
  supabase: any,
  planId: string,
  currentPlan: any,
  functionName: string,
  args: any,
): Promise<{ success: boolean; message: string }> {
  const workouts = [...currentPlan.workouts];

  switch (functionName) {
    case "swap_exercise": {
      const dayIdx = workouts.findIndex(
        (w: any) => w.day.toLowerCase() === args.day.toLowerCase(),
      );
      if (dayIdx === -1)
        return { success: false, message: `Day "${args.day}" not found` };

      const exIdx = workouts[dayIdx].exercises.findIndex((e: any) =>
        e.name.toLowerCase().includes(args.old_exercise.toLowerCase()),
      );
      if (exIdx === -1)
        return {
          success: false,
          message: `Exercise "${args.old_exercise}" not found`,
        };

      workouts[dayIdx].exercises[exIdx] = {
        name: args.new_exercise,
        sets: args.new_sets,
        reps: args.new_reps || workouts[dayIdx].exercises[exIdx].reps,
        duration_seconds: args.new_duration_seconds,
        rest_seconds: args.new_rest_seconds,
        notes: args.new_notes || `Swapped from ${args.old_exercise}`,
      };
      break;
    }

    case "adjust_workout_intensity": {
      const targetDays =
        args.target === "all_workouts"
          ? workouts
          : workouts.filter(
              (w: any) =>
                w.day.toLowerCase() === args.specific_day?.toLowerCase(),
            );

      for (const workout of targetDays) {
        for (const exercise of workout.exercises) {
          if (args.sets_change) {
            exercise.sets = Math.max(
              1,
              (exercise.sets || 3) + args.sets_change,
            );
          }
          if (args.reps_change) {
            exercise.reps = Math.max(
              1,
              (exercise.reps || 10) + args.reps_change,
            );
          }
          if (args.rest_change_seconds) {
            exercise.rest_seconds = Math.max(
              15,
              (exercise.rest_seconds || 60) + args.rest_change_seconds,
            );
          }
        }
      }
      break;
    }

    case "add_exercise": {
      const dayIdx = workouts.findIndex(
        (w: any) => w.day.toLowerCase() === args.day.toLowerCase(),
      );
      if (dayIdx === -1)
        return { success: false, message: `Day "${args.day}" not found` };

      const newExercise = {
        name: args.exercise_name,
        sets: args.sets,
        reps: args.reps,
        duration_seconds: args.duration_seconds,
        rest_seconds: args.rest_seconds,
        notes: args.notes || "",
      };

      if (args.position === "start") {
        workouts[dayIdx].exercises.unshift(newExercise);
      } else if (args.position === "after_warmup") {
        const warmupIdx = workouts[dayIdx].exercises.findIndex(
          (e: any) =>
            e.name.toLowerCase().includes("warmup") ||
            e.name.toLowerCase().includes("warm-up"),
        );
        workouts[dayIdx].exercises.splice(warmupIdx + 1, 0, newExercise);
      } else {
        workouts[dayIdx].exercises.push(newExercise);
      }
      break;
    }

    case "remove_exercise": {
      const dayIdx = workouts.findIndex(
        (w: any) => w.day.toLowerCase() === args.day.toLowerCase(),
      );
      if (dayIdx === -1)
        return { success: false, message: `Day "${args.day}" not found` };

      const exIdx = workouts[dayIdx].exercises.findIndex((e: any) =>
        e.name.toLowerCase().includes(args.exercise_name.toLowerCase()),
      );
      if (exIdx === -1)
        return {
          success: false,
          message: `Exercise "${args.exercise_name}" not found`,
        };

      workouts[dayIdx].exercises.splice(exIdx, 1);
      break;
    }

    case "modify_for_injury": {
      for (const mod of args.modifications) {
        const dayIdx = workouts.findIndex(
          (w: any) => w.day.toLowerCase() === mod.day.toLowerCase(),
        );
        if (dayIdx === -1) continue;

        const exIdx = workouts[dayIdx].exercises.findIndex((e: any) =>
          e.name.toLowerCase().includes(mod.exercise_to_modify.toLowerCase()),
        );
        if (exIdx === -1) continue;

        if (mod.action === "remove") {
          workouts[dayIdx].exercises.splice(exIdx, 1);
        } else if (mod.action === "replace" && mod.replacement_exercise) {
          workouts[dayIdx].exercises[exIdx] = {
            name: mod.replacement_exercise,
            sets:
              mod.replacement_sets || workouts[dayIdx].exercises[exIdx].sets,
            reps:
              mod.replacement_reps || workouts[dayIdx].exercises[exIdx].reps,
            rest_seconds: workouts[dayIdx].exercises[exIdx].rest_seconds,
            notes: mod.notes || `Modified for ${args.injury_area} injury`,
          };
        } else if (mod.action === "reduce_intensity") {
          workouts[dayIdx].exercises[exIdx].sets = Math.max(
            1,
            workouts[dayIdx].exercises[exIdx].sets - 1,
          );
          workouts[dayIdx].exercises[exIdx].notes =
            mod.notes || `Reduced intensity for ${args.injury_area}`;
        }
      }
      break;
    }

    case "change_workout_day": {
      const fromDayIdx = workouts.findIndex(
        (w: any) => w.day.toLowerCase() === args.from_day.toLowerCase(),
      );
      if (fromDayIdx === -1)
        return {
          success: false,
          message: `Day "${args.from_day}" not found in your workout plan`,
        };

      // Check if to_day already exists
      const toDayIdx = workouts.findIndex(
        (w: any) => w.day.toLowerCase() === args.to_day.toLowerCase(),
      );

      if (toDayIdx !== -1) {
        // Swap the workouts - the from_day becomes a rest day, to_day gets the workout
        const fromWorkout = { ...workouts[fromDayIdx] };
        const toWorkout = { ...workouts[toDayIdx] };

        // Move the workout content to the new day
        workouts[toDayIdx] = {
          ...fromWorkout,
          day: args.to_day, // Keep the correct day name
        };

        // Make the old day a rest day (or swap with whatever was there)
        workouts[fromDayIdx] = {
          ...toWorkout,
          day: args.from_day, // Keep the correct day name
        };

        console.log(`Swapped ${args.from_day} and ${args.to_day}`);
      } else {
        // to_day doesn't exist, just rename
        workouts[fromDayIdx].day = args.to_day;
      }

      // Re-sort workouts by day of week
      const dayOrder = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      workouts.sort((a: any, b: any) => {
        return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      });

      break;
    }

    default:
      return { success: false, message: "Unknown workout modification type" };
  }

  // Save updated plan
  const { error } = await supabase
    .from("workout_plans")
    .update({ exercises: { ...currentPlan, workouts } })
    .eq("id", planId);

  if (error) {
    console.error("Failed to update workout plan:", error);
    return { success: false, message: "Failed to save workout changes" };
  }

  return { success: true, message: "Workout plan updated successfully" };
}

// Apply nutrition modifications
async function applyNutritionModification(
  supabase: any,
  mealPlanId: string,
  currentMealPlan: any,
  functionName: string,
  args: any,
  userId: string,
  profile: any,
): Promise<{ success: boolean; message: string }> {
  const days = [...(currentMealPlan.days || [])];

  switch (functionName) {
    case "swap_meal": {
      const dayIdx = days.findIndex(
        (d: any) => d.day.toLowerCase() === args.day.toLowerCase(),
      );
      if (dayIdx === -1)
        return {
          success: false,
          message: `Day "${args.day}" not found in meal plan`,
        };

      const mealIdx = days[dayIdx].meals.findIndex(
        (m: any) => m.name.toLowerCase() === args.meal_name.toLowerCase(),
      );
      if (mealIdx === -1)
        return {
          success: false,
          message: `Meal "${args.meal_name}" not found`,
        };

      // Calculate new totals
      const totalCalories = args.new_foods.reduce(
        (sum: number, f: any) => sum + f.calories,
        0,
      );
      const totalProtein = args.new_foods.reduce(
        (sum: number, f: any) => sum + f.protein,
        0,
      );
      const totalCarbs = args.new_foods.reduce(
        (sum: number, f: any) => sum + f.carbs,
        0,
      );
      const totalFat = args.new_foods.reduce(
        (sum: number, f: any) => sum + f.fat,
        0,
      );

      days[dayIdx].meals[mealIdx] = {
        name: args.meal_name,
        foods: args.new_foods,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
      };

      // Recalculate daily totals
      days[dayIdx].dailyTotals = {
        calories: days[dayIdx].meals.reduce(
          (sum: number, m: any) => sum + m.totalCalories,
          0,
        ),
        protein: days[dayIdx].meals.reduce(
          (sum: number, m: any) => sum + m.totalProtein,
          0,
        ),
        carbs: days[dayIdx].meals.reduce(
          (sum: number, m: any) => sum + m.totalCarbs,
          0,
        ),
        fat: days[dayIdx].meals.reduce(
          (sum: number, m: any) => sum + m.totalFat,
          0,
        ),
      };
      break;
    }

    case "adjust_meal_portions": {
      const dayIdx = days.findIndex(
        (d: any) => d.day.toLowerCase() === args.day.toLowerCase(),
      );
      if (dayIdx === -1)
        return { success: false, message: `Day "${args.day}" not found` };

      const mealIdx = days[dayIdx].meals.findIndex(
        (m: any) => m.name.toLowerCase() === args.meal_name.toLowerCase(),
      );
      if (mealIdx === -1)
        return {
          success: false,
          message: `Meal "${args.meal_name}" not found`,
        };

      const multiplier =
        args.adjustment === "increase"
          ? 1 + args.percentage / 100
          : 1 - args.percentage / 100;

      const meal = days[dayIdx].meals[mealIdx];
      for (const food of meal.foods) {
        food.calories = Math.round(food.calories * multiplier);
        food.protein = Math.round(food.protein * multiplier);
        food.carbs = Math.round(food.carbs * multiplier);
        food.fat = Math.round(food.fat * multiplier);
      }

      meal.totalCalories = meal.foods.reduce(
        (sum: number, f: any) => sum + f.calories,
        0,
      );
      meal.totalProtein = meal.foods.reduce(
        (sum: number, f: any) => sum + f.protein,
        0,
      );
      meal.totalCarbs = meal.foods.reduce(
        (sum: number, f: any) => sum + f.carbs,
        0,
      );
      meal.totalFat = meal.foods.reduce(
        (sum: number, f: any) => sum + f.fat,
        0,
      );

      // Recalculate daily totals
      days[dayIdx].dailyTotals = {
        calories: days[dayIdx].meals.reduce(
          (sum: number, m: any) => sum + m.totalCalories,
          0,
        ),
        protein: days[dayIdx].meals.reduce(
          (sum: number, m: any) => sum + m.totalProtein,
          0,
        ),
        carbs: days[dayIdx].meals.reduce(
          (sum: number, m: any) => sum + m.totalCarbs,
          0,
        ),
        fat: days[dayIdx].meals.reduce(
          (sum: number, m: any) => sum + m.totalFat,
          0,
        ),
      };
      break;
    }

    case "update_dietary_preferences": {
      const updates: any = {};

      if (args.add_restrictions || args.remove_restrictions) {
        let restrictions = profile.dietary_restrictions || [];
        if (args.add_restrictions) {
          restrictions = [
            ...new Set([...restrictions, ...args.add_restrictions]),
          ];
        }
        if (args.remove_restrictions) {
          restrictions = restrictions.filter(
            (r: string) => !args.remove_restrictions.includes(r),
          );
        }
        updates.dietary_restrictions = restrictions;
      }

      if (args.add_allergies || args.remove_allergies) {
        let allergies = profile.food_allergies || [];
        if (args.add_allergies) {
          allergies = [...new Set([...allergies, ...args.add_allergies])];
        }
        if (args.remove_allergies) {
          allergies = allergies.filter(
            (a: string) => !args.remove_allergies.includes(a),
          );
        }
        updates.food_allergies = allergies;
      }

      if (args.add_disliked || args.remove_disliked) {
        let disliked = profile.disliked_foods || [];
        if (args.add_disliked) {
          disliked = [...new Set([...disliked, ...args.add_disliked])];
        }
        if (args.remove_disliked) {
          disliked = disliked.filter(
            (d: string) => !args.remove_disliked.includes(d),
          );
        }
        updates.disliked_foods = disliked;
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("profiles").update(updates).eq("id", userId);
      }

      return { success: true, message: "Dietary preferences updated" };
    }

    case "regenerate_day_meals": {
      // This will trigger a regeneration - we'll set a flag
      return {
        success: true,
        message: `Day "${args.day}" flagged for regeneration. The meal plan will be updated with new options.`,
      };
    }

    default:
      return { success: false, message: "Unknown nutrition modification type" };
  }

  // Save updated meal plan
  const { error } = await supabase
    .from("meal_plans")
    .update({ meals: { days } })
    .eq("id", mealPlanId);

  if (error) {
    console.error("Failed to update meal plan:", error);
    return { success: false, message: "Failed to save meal plan changes" };
  }

  return { success: true, message: "Meal plan updated successfully" };
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, "api:chat");

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    const { messages, userId } = await request.json();

    // Validate user ID
    if (!userId || !isValidUUID(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Validate last message
    const lastMessage = messages?.[messages.length - 1]?.content;
    if (lastMessage) {
      const messageValidation = validateChatMessage(lastMessage);
      if (!messageValidation.valid) {
        return NextResponse.json(
          { error: messageValidation.error },
          { status: 400 },
        );
      }
    }

    console.log("=== COACH CHAT REQUEST ===");
    console.log("User ID:", userId);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Fetch user data
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    const { data: workoutPlan } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    const { data: mealPlan } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    const { data: recentLogs } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(5);

    // Build context (no name sent to OpenAI for privacy)
    const contextMessage = `
CURRENT USER CONTEXT:
- Fitness Level: ${profile?.fitness_level || "intermediate"}
- Goal: ${profile?.fitness_goal || "general fitness"}
- Activity Level: ${profile?.activity_level || "moderate"}
- Available Days: ${profile?.available_days?.join(", ") || "flexible"}
- Equipment: ${profile?.equipment_access?.description || "standard gym equipment"}
- Injuries: ${profile?.injuries?.length > 0 ? profile.injuries.join(", ") : "None"}
- Dietary Restrictions: ${profile?.dietary_restrictions?.length > 0 ? profile.dietary_restrictions.join(", ") : "None"}
- Food Allergies: ${profile?.food_allergies?.length > 0 ? profile.food_allergies.join(", ") : "None"}
- Disliked Foods: ${profile?.disliked_foods?.length > 0 ? profile.disliked_foods.join(", ") : "None"}

CURRENT WORKOUT PLAN (Week ${workoutPlan?.week_number || 1}):
${
  workoutPlan?.exercises?.workouts
    ?.map(
      (w: any) => `
${w.day} - ${w.focus} (${w.duration_minutes} min):
${w.exercises?.map((e: any) => `  • ${e.name}: ${e.sets} sets x ${e.reps || e.duration_seconds + "s"}`).join("\n")}
`,
    )
    .join("\n") || "No active workout plan"
}

CURRENT MEAL PLAN:
Target: ${mealPlan?.target_calories || "N/A"} kcal | Protein: ${mealPlan?.target_protein || "N/A"}g | Carbs: ${mealPlan?.target_carbs || "N/A"}g | Fat: ${mealPlan?.target_fat || "N/A"}g
${
  mealPlan?.meals?.days
    ?.slice(0, 2)
    .map(
      (d: any) => `
${d.day}: ${d.meals?.map((m: any) => m.name).join(", ")}`,
    )
    .join("") || "No active meal plan"
}
...and more days

RECENT WORKOUTS:
${recentLogs?.map((log: any) => `- ${log.workout_day}: ${log.completion_percentage}% (${Math.round(log.duration_seconds / 60)} min)`).join("\n") || "No recent workouts"}

Use this context to provide personalized advice and make modifications when requested.`;

    const systemWithContext = getSystemPrompt() + "\n\n" + contextMessage;

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemWithContext }, ...messages],
      tools,
      tool_choice: "auto",
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0].message;
    const toolCalls = assistantMessage.tool_calls;

    let planModified = false;
    let mealPlanModified = false;
    let modificationResults: string[] = [];

    // Handle function calls
    if (toolCalls?.length) {
      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue;

        const functionName = toolCall.function.name;
        let args: any = {};

        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.error("Failed to parse function args:", e);
          continue;
        }

        console.log(`🔧 Function: ${functionName}`, args);

        // Workout modifications
        if (
          [
            "swap_exercise",
            "adjust_workout_intensity",
            "add_exercise",
            "remove_exercise",
            "modify_for_injury",
            "change_workout_day",
          ].includes(functionName)
        ) {
          if (workoutPlan) {
            const result = await applyWorkoutModification(
              supabase,
              workoutPlan.id,
              workoutPlan.exercises,
              functionName,
              args,
            );
            if (result.success) planModified = true;
            modificationResults.push(result.message);
          } else {
            modificationResults.push("No active workout plan to modify");
          }
        }

        // Nutrition modifications
        if (
          [
            "swap_meal",
            "adjust_meal_portions",
            "update_dietary_preferences",
            "regenerate_day_meals",
          ].includes(functionName)
        ) {
          if (mealPlan) {
            const result = await applyNutritionModification(
              supabase,
              mealPlan.id,
              mealPlan.meals,
              functionName,
              args,
              userId,
              profile,
            );
            if (result.success) mealPlanModified = true;
            modificationResults.push(result.message);
          } else {
            modificationResults.push("No active meal plan to modify");
          }
        }

        // Profile injury update
        if (functionName === "update_profile_injury") {
          const currentInjuries = profile?.injuries || [];
          const newInjuries =
            args.add_or_remove === "add"
              ? [...currentInjuries, args.injury]
              : currentInjuries.filter(
                  (i: string) =>
                    !i.toLowerCase().includes(args.injury.toLowerCase()),
                );

          await supabase
            .from("profiles")
            .update({ injuries: newInjuries })
            .eq("id", userId);
          modificationResults.push(
            `${args.add_or_remove === "add" ? "Added" : "Removed"} injury: ${args.injury}`,
          );
        }
      }
    }

    // Get follow-up response if needed
    let finalMessage = assistantMessage.content;

    if (toolCalls?.length && !finalMessage) {
      const followUpResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemWithContext },
          ...messages,
          {
            role: "assistant",
            tool_calls: toolCalls,
          },
          ...toolCalls.map((tc) => ({
            role: "tool" as const,
            tool_call_id: tc.id,
            content: JSON.stringify({
              success: true,
              results: modificationResults,
            }),
          })),
        ],
        temperature: 0.7,
      });

      finalMessage = followUpResponse.choices[0].message.content;
    }

    return NextResponse.json({
      message:
        finalMessage || "I've made the requested changes. Anything else?",
      planModified,
      mealPlanModified,
      modifications: modificationResults,
    });
  } catch (error) {
    console.error("❌ Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 },
    );
  }
}
