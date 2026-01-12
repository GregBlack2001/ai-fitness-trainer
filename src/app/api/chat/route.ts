import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const SYSTEM_PROMPT = `You are an expert AI fitness coach with deep knowledge of exercise science, nutrition, and training programming. You have access to the user's profile and current workout plan.

Your capabilities include:
1. **Answering fitness questions** - nutrition, form, recovery, motivation, etc.
2. **Modifying workout plans** - swap exercises, change days, adjust intensity
3. **Accommodating injuries** - modify exercises to work around limitations
4. **Providing encouragement** - motivate and support the user's journey

IMPORTANT GUIDELINES:
- Be conversational, supportive, and encouraging
- When modifying workouts, explain WHY you're making changes
- For injuries, always recommend consulting a healthcare professional for serious concerns
- When swapping exercises, ensure the replacement targets the same muscle groups
- Keep responses concise but helpful

When you need to modify the workout plan, use the available functions. Always confirm changes with the user before making them permanent.

Current date context: The user is working through their personalized workout plan.`;

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "swap_exercise",
      description:
        "Replace one exercise with another in the workout plan. Use when user wants to change a specific exercise.",
      parameters: {
        type: "object",
        properties: {
          day: {
            type: "string",
            description: "The workout day (e.g., 'Monday', 'Wednesday')",
          },
          old_exercise: {
            type: "string",
            description: "Name of the exercise to replace",
          },
          new_exercise: {
            type: "string",
            description: "Name of the replacement exercise",
          },
          new_sets: {
            type: "number",
            description: "Number of sets for new exercise",
          },
          new_reps: {
            type: "number",
            description:
              "Number of reps for new exercise (optional if duration-based)",
          },
          new_duration_seconds: {
            type: "number",
            description: "Duration in seconds (optional, for timed exercises)",
          },
          new_rest_seconds: {
            type: "number",
            description: "Rest period between sets in seconds",
          },
          new_notes: {
            type: "string",
            description: "Form cues or notes for the new exercise",
          },
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
      name: "move_workout_day",
      description:
        "Move a workout from one day to another. Use when user needs to reschedule.",
      parameters: {
        type: "object",
        properties: {
          from_day: {
            type: "string",
            description: "Current day of the workout (e.g., 'Monday')",
          },
          to_day: {
            type: "string",
            description: "New day for the workout (e.g., 'Tuesday')",
          },
          reason: {
            type: "string",
            description: "Why the day is being changed",
          },
        },
        required: ["from_day", "to_day", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "modify_for_injury",
      description:
        "Modify the workout plan to accommodate an injury. Removes or replaces exercises that could aggravate the injury.",
      parameters: {
        type: "object",
        properties: {
          injury_area: {
            type: "string",
            description:
              "Body part or area affected (e.g., 'lower back', 'right knee', 'shoulder')",
          },
          severity: {
            type: "string",
            enum: ["mild", "moderate", "severe"],
            description: "How severe is the injury",
          },
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
            description: "List of modifications to make",
          },
          general_advice: {
            type: "string",
            description: "General advice for training with this injury",
          },
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
      name: "adjust_intensity",
      description:
        "Adjust the overall intensity of workouts (sets, reps, or rest periods)",
      parameters: {
        type: "object",
        properties: {
          adjustment_type: {
            type: "string",
            enum: ["increase", "decrease"],
            description: "Whether to increase or decrease intensity",
          },
          target: {
            type: "string",
            enum: ["all_workouts", "specific_day"],
            description: "Apply to all workouts or a specific day",
          },
          specific_day: {
            type: "string",
            description: "If target is specific_day, which day",
          },
          sets_change: {
            type: "number",
            description: "How many sets to add/remove (e.g., 1 or -1)",
          },
          reps_change: {
            type: "number",
            description: "How many reps to add/remove per set",
          },
          rest_change_seconds: {
            type: "number",
            description:
              "How much to adjust rest periods (positive = more rest)",
          },
          reason: {
            type: "string",
            description: "Why intensity is being adjusted",
          },
        },
        required: ["adjustment_type", "target", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_exercise",
      description: "Add a new exercise to a specific workout day",
      parameters: {
        type: "object",
        properties: {
          day: {
            type: "string",
            description: "The workout day to add the exercise to",
          },
          exercise_name: {
            type: "string",
            description: "Name of the exercise to add",
          },
          sets: {
            type: "number",
            description: "Number of sets",
          },
          reps: {
            type: "number",
            description: "Number of reps (optional if duration-based)",
          },
          duration_seconds: {
            type: "number",
            description: "Duration in seconds (optional)",
          },
          rest_seconds: {
            type: "number",
            description: "Rest between sets",
          },
          notes: {
            type: "string",
            description: "Form cues or notes",
          },
          position: {
            type: "string",
            enum: ["start", "end", "after_warmup"],
            description: "Where to add the exercise in the workout",
          },
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
          day: {
            type: "string",
            description: "The workout day",
          },
          exercise_name: {
            type: "string",
            description: "Name of the exercise to remove",
          },
          reason: {
            type: "string",
            description: "Why the exercise is being removed",
          },
        },
        required: ["day", "exercise_name", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_exercise_alternatives",
      description:
        "Get alternative exercises for a specific exercise (doesn't modify plan, just suggests)",
      parameters: {
        type: "object",
        properties: {
          exercise_name: {
            type: "string",
            description: "The exercise to find alternatives for",
          },
          reason: {
            type: "string",
            description:
              "Why alternatives are needed (e.g., 'no equipment', 'injury', 'preference')",
          },
          equipment_available: {
            type: "string",
            description: "What equipment the user has access to",
          },
        },
        required: ["exercise_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_profile_injury",
      description:
        "Update the user's profile with injury information for future workout generation",
      parameters: {
        type: "object",
        properties: {
          injury: {
            type: "string",
            description: "Description of the injury",
          },
          add_or_remove: {
            type: "string",
            enum: ["add", "remove"],
            description:
              "Whether to add or remove this injury from the profile",
          },
        },
        required: ["injury", "add_or_remove"],
      },
    },
  },
];

// Helper function to apply modifications to workout plan
async function applyWorkoutModification(
  supabase: any,
  planId: string,
  currentPlan: any,
  functionName: string,
  args: any
): Promise<{ success: boolean; message: string; updatedPlan?: any }> {
  const workouts = [...currentPlan.workouts];

  switch (functionName) {
    case "swap_exercise": {
      const dayIndex = workouts.findIndex(
        (w: any) => w.day.toLowerCase() === args.day.toLowerCase()
      );
      if (dayIndex === -1) {
        return {
          success: false,
          message: `Couldn't find workout for ${args.day}`,
        };
      }

      const exerciseIndex = workouts[dayIndex].exercises.findIndex((e: any) =>
        e.name.toLowerCase().includes(args.old_exercise.toLowerCase())
      );
      if (exerciseIndex === -1) {
        return {
          success: false,
          message: `Couldn't find exercise "${args.old_exercise}" on ${args.day}`,
        };
      }

      workouts[dayIndex].exercises[exerciseIndex] = {
        name: args.new_exercise,
        sets: args.new_sets,
        reps: args.new_reps || null,
        duration_seconds: args.new_duration_seconds || null,
        rest_seconds: args.new_rest_seconds,
        notes:
          args.new_notes || `Swapped from ${args.old_exercise}: ${args.reason}`,
      };
      break;
    }

    case "move_workout_day": {
      const fromIndex = workouts.findIndex(
        (w: any) => w.day.toLowerCase() === args.from_day.toLowerCase()
      );
      if (fromIndex === -1) {
        return {
          success: false,
          message: `Couldn't find workout for ${args.from_day}`,
        };
      }

      workouts[fromIndex].day = args.to_day;
      // Re-sort by day order
      const dayOrder = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      workouts.sort(
        (a: any, b: any) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
      );
      break;
    }

    case "remove_exercise": {
      const dayIdx = workouts.findIndex(
        (w: any) => w.day.toLowerCase() === args.day.toLowerCase()
      );
      if (dayIdx === -1) {
        return {
          success: false,
          message: `Couldn't find workout for ${args.day}`,
        };
      }

      const exIdx = workouts[dayIdx].exercises.findIndex((e: any) =>
        e.name.toLowerCase().includes(args.exercise_name.toLowerCase())
      );
      if (exIdx === -1) {
        return {
          success: false,
          message: `Couldn't find exercise "${args.exercise_name}"`,
        };
      }

      workouts[dayIdx].exercises.splice(exIdx, 1);
      break;
    }

    case "add_exercise": {
      const dayIndex2 = workouts.findIndex(
        (w: any) => w.day.toLowerCase() === args.day.toLowerCase()
      );
      if (dayIndex2 === -1) {
        return {
          success: false,
          message: `Couldn't find workout for ${args.day}`,
        };
      }

      const newExercise = {
        name: args.exercise_name,
        sets: args.sets,
        reps: args.reps || null,
        duration_seconds: args.duration_seconds || null,
        rest_seconds: args.rest_seconds,
        notes: args.notes || "",
      };

      if (args.position === "start") {
        workouts[dayIndex2].exercises.unshift(newExercise);
      } else if (
        args.position === "after_warmup" &&
        workouts[dayIndex2].exercises.length > 0
      ) {
        workouts[dayIndex2].exercises.splice(1, 0, newExercise);
      } else {
        workouts[dayIndex2].exercises.push(newExercise);
      }
      break;
    }

    case "adjust_intensity": {
      const daysToModify =
        args.target === "all_workouts"
          ? workouts
          : workouts.filter(
              (w: any) =>
                w.day.toLowerCase() === args.specific_day?.toLowerCase()
            );

      daysToModify.forEach((workout: any) => {
        workout.exercises.forEach((exercise: any) => {
          if (args.sets_change) {
            exercise.sets = Math.max(
              1,
              (exercise.sets || 3) + args.sets_change
            );
          }
          if (args.reps_change && exercise.reps) {
            exercise.reps = Math.max(1, exercise.reps + args.reps_change);
          }
          if (args.rest_change_seconds) {
            exercise.rest_seconds = Math.max(
              15,
              (exercise.rest_seconds || 60) + args.rest_change_seconds
            );
          }
        });
      });
      break;
    }

    case "modify_for_injury": {
      for (const mod of args.modifications) {
        const dayIdx = workouts.findIndex(
          (w: any) => w.day.toLowerCase() === mod.day.toLowerCase()
        );
        if (dayIdx === -1) continue;

        const exIdx = workouts[dayIdx].exercises.findIndex((e: any) =>
          e.name.toLowerCase().includes(mod.exercise_to_modify.toLowerCase())
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
            workouts[dayIdx].exercises[exIdx].sets - 1
          );
          workouts[dayIdx].exercises[exIdx].notes =
            mod.notes || `Reduced intensity for ${args.injury_area}`;
        }
      }
      break;
    }

    default:
      return { success: false, message: "Unknown modification type" };
  }

  // Save updated plan
  const updatedExercises = { ...currentPlan, workouts };
  const { error } = await supabase
    .from("workout_plans")
    .update({
      exercises: updatedExercises,
    })
    .eq("id", planId);

  if (error) {
    console.error("Failed to update plan:", error);
    return { success: false, message: "Failed to save changes to database" };
  }

  return {
    success: true,
    message: "Plan updated successfully",
    updatedPlan: updatedExercises,
  };
}

export async function POST(request: Request) {
  try {
    const { messages, userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 401 });
    }

    console.log("=== COACH CHAT REQUEST ===");
    console.log("User ID:", userId);
    console.log("Messages:", messages.length);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Fetch active workout plan
    const { data: plan } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    // Fetch recent workout logs
    const { data: recentLogs } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(5);

    // Build context for AI
    const contextMessage = `
CURRENT USER CONTEXT:
- Name: ${profile?.full_name || "User"}
- Fitness Level: ${profile?.fitness_level || "intermediate"}
- Goal: ${profile?.fitness_goal || "general fitness"}
- Available Days: ${profile?.available_days?.join(", ") || "flexible"}
- Equipment: ${
      profile?.equipment_access?.description || "standard gym equipment"
    }
- Known Injuries: ${
      profile?.injuries?.length > 0
        ? profile.injuries.join(", ")
        : "None recorded"
    }

CURRENT WORKOUT PLAN (Week ${plan?.week_number || 1}):
${
  plan?.exercises?.workouts
    ?.map(
      (w: any) => `
${w.day} - ${w.focus} (${w.duration_minutes} min):
${w.exercises
  ?.map(
    (e: any) =>
      `  • ${e.name}: ${e.sets} sets x ${e.reps || e.duration_seconds + "s"}`
  )
  .join("\n")}
`
    )
    .join("\n") || "No active plan"
}

RECENT ACTIVITY:
${
  recentLogs
    ?.map(
      (log: any) =>
        `- ${log.workout_day}: ${
          log.completion_percentage
        }% completed (${Math.round(log.duration_seconds / 60)} min)`
    )
    .join("\n") || "No recent workouts"
}

Use this context to provide personalized advice and make appropriate modifications when requested.`;

    const systemWithContext = SYSTEM_PROMPT + "\n\n" + contextMessage;

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

        console.log(`🔧 Function call: ${functionName}`, args);

        // Handle non-modifying functions
        if (functionName === "get_exercise_alternatives") {
          // This just returns suggestions, doesn't modify
          modificationResults.push(
            `Suggested alternatives for ${args.exercise_name}`
          );
          continue;
        }

        if (functionName === "update_profile_injury") {
          // Update profile injuries
          const currentInjuries = profile?.injuries || [];
          let newInjuries;

          if (args.add_or_remove === "add") {
            newInjuries = [...currentInjuries, args.injury];
          } else {
            newInjuries = currentInjuries.filter(
              (i: string) =>
                !i.toLowerCase().includes(args.injury.toLowerCase())
            );
          }

          await supabase
            .from("profiles")
            .update({
              injuries: newInjuries,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

          modificationResults.push(
            `${args.add_or_remove === "add" ? "Added" : "Removed"} injury: ${
              args.injury
            }`
          );
          continue;
        }

        // Handle plan modifications
        if (plan) {
          const result = await applyWorkoutModification(
            supabase,
            plan.id,
            plan.exercises,
            functionName,
            args
          );

          if (result.success) {
            planModified = true;
            modificationResults.push(result.message);
          } else {
            modificationResults.push(`⚠️ ${result.message}`);
          }
        }
      }
    }

    // If we made tool calls but need a follow-up response
    let finalMessage = assistantMessage.content;

    if (toolCalls?.length && !finalMessage) {
      const followUpMessages = [
        ...messages,
        {
          role: "assistant" as const,
          tool_calls: toolCalls,
        },
        ...toolCalls.map((toolCall) => ({
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            success: true,
            results: modificationResults,
            plan_modified: planModified,
          }),
        })),
      ];

      const followUpResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemWithContext },
          ...followUpMessages,
        ],
        temperature: 0.7,
      });

      finalMessage = followUpResponse.choices[0].message.content;
    }

    return NextResponse.json({
      message:
        finalMessage ||
        "I've processed your request. Is there anything else you'd like to adjust?",
      planModified,
      modifications: modificationResults,
    });
  } catch (error) {
    console.error("❌ Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
