import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/server";
import { validateProfileData, validateWorkoutPlan } from "@/lib/validation";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const SYSTEM_PROMPT = `You're a friendly fitness coach getting to know a new client. Chat naturally — like meeting someone at the gym for the first time.

THE USER'S NAME IS ALREADY KNOWN — don't ask for it.

## YOUR VIBE
- Warm and welcoming, but not fake
- Quick and efficient — respect their time
- Genuinely curious about their goals
- React naturally to what they share ("Oh nice!", "That's a solid goal", "I can work with that")

## CRITICAL RULES
- Keep responses to 1-2 sentences
- ONE question at a time
- No lists, no bullet points, no markdown headers
- No previewing their plan — just collect info for now
- **ALWAYS call update_profile immediately when they give you ANY data**
- **If they give multiple pieces of info at once, extract ALL of them in a single update_profile call**
- **Never ask for info they already provided**

## HANDLING INJURIES - VERY IMPORTANT
When a user mentions ANY injury, pain, or physical limitation (e.g., "ACL tear", "bad back", "knee pain", "sprained ankle", "shoulder injury", etc.):
1. Save the injury using update_profile immediately
2. ALWAYS include this disclaimer in your response:
   "⚠️ Important: I'm not a medical professional. Please make sure you've been cleared by a doctor or physiotherapist before starting any exercise programme. I'll design your workouts to avoid aggravating your injury, but this isn't medical advice."
3. Then continue with the next question

## HANDLING MULTIPLE DATA POINTS
If user says "I'm 25, male, 180cm, 80kg" — extract ALL of those in ONE update_profile call:
{ "age": 25, "gender": "male", "height_cm": 180, "weight_kg": 80 }

If user says "I want to build muscle, I'm intermediate, go to the gym 4 days" — extract ALL:
{ "fitness_goal": "build muscle", "fitness_level": "intermediate", "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday"] }

## GOOD EXAMPLES
- "Sweet! How old are you?"
- "Awesome goal. What would you say your fitness level is right now — beginner, intermediate, or more advanced?"
- "Got it. Any injuries I should know about, or are you good to go?"
- "Last thing — any foods you absolutely hate? I'll make sure they don't show up in your meal plan."

## BAD EXAMPLES (don't do these)
- "Great! Here's what I'm thinking for your plan: Day 1 will be..." ❌
- "### Your Profile\n- Age: 25\n- Goal: Build muscle..." ❌
- "What is your name?" ❌
- Asking for age when they already told you ❌
- Ignoring data they provided ❌
- NOT giving the medical disclaimer when they mention an injury ❌

## INFO TO COLLECT (in this order, skip name)
1. age
2. gender  
3. height_cm
4. weight_kg
5. fitness_goal (lose weight, build muscle, get stronger, etc.)
6. fitness_level (beginner, intermediate, advanced)
7. activity_level (sedentary, light, moderate, active, very_active)
8. preferred_workout_days — "Which days work best for you to train?"
9. equipment_access (full gym, home setup, just bodyweight, etc.)
10. injuries (anything to work around)
11. dietary_restrictions (veg, vegan, gluten-free, etc.)
12. food_allergies
13. disliked_foods
14. meals_per_day (how many meals they like to eat)

Once you have everything, call complete_onboarding.`;

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "update_profile",
      description:
        "Update user profile with any extracted information. Call immediately when you get ANY data.",
      parameters: {
        type: "object",
        properties: {
          full_name: { type: "string" },
          age: { type: "number" },
          gender: { type: "string" },
          height_cm: { type: "number" },
          weight_kg: { type: "number" },
          fitness_goal: { type: "string" },
          fitness_level: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"],
          },
          activity_level: {
            type: "string",
            enum: ["sedentary", "light", "moderate", "active", "very_active"],
          },
          available_days: { type: "array", items: { type: "string" } },
          equipment_access: { type: "string" },
          injuries: { type: "array", items: { type: "string" } },
          dietary_restrictions: { type: "array", items: { type: "string" } },
          food_allergies: { type: "array", items: { type: "string" } },
          disliked_foods: { type: "array", items: { type: "string" } },
          meals_per_day: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_onboarding",
      description:
        "Call when ALL information is collected including nutrition preferences",
      parameters: {
        type: "object",
        properties: { ready: { type: "boolean" } },
        required: ["ready"],
      },
    },
  },
];

// Helper function to generate injury-specific exercise restrictions
function getInjuryRestrictions(injuries: string[]): string {
  if (!injuries || injuries.length === 0) return "";

  const restrictions: string[] = [];
  const injuryLower = injuries.map((i) => i.toLowerCase()).join(" ");

  // ACL / Knee injuries
  if (
    injuryLower.includes("acl") ||
    injuryLower.includes("knee") ||
    injuryLower.includes("mcl") ||
    injuryLower.includes("meniscus")
  ) {
    restrictions.push(`
**KNEE/ACL INJURY - CRITICAL RESTRICTIONS:**
- NEVER include: Squats, Lunges, Leg Press with deep knee bend, Box Jumps, Jump Squats, Jumping exercises, Running, Plyometrics
- AVOID: Any exercise requiring deep knee flexion beyond 90 degrees
- SAFE alternatives: Leg Extensions (limited ROM), Leg Curls, Hip Thrusts, Glute Bridges, Seated Calf Raises, Upper body exercises
- Focus on: Upper body work, core stability, hip strengthening`);
  }

  // Ankle injuries
  if (injuryLower.includes("ankle") || injuryLower.includes("achilles")) {
    restrictions.push(`
**ANKLE INJURY - CRITICAL RESTRICTIONS:**
- NEVER include: Running, Jumping, Box Jumps, Jump Rope, Standing Calf Raises, Lunges, any plyometric movements
- AVOID: Exercises requiring ankle stability or single-leg balance
- SAFE alternatives: Seated exercises, Upper body work, Leg Press (if pain-free), Leg Curls, Leg Extensions, Swimming movements
- Focus on: Seated and lying exercises, upper body, core work`);
  }

  // Shoulder injuries
  if (injuryLower.includes("shoulder") || injuryLower.includes("rotator")) {
    restrictions.push(`
**SHOULDER INJURY - CRITICAL RESTRICTIONS:**
- NEVER include: Overhead Press, Behind-neck exercises, Upright Rows, Dips (if painful), Wide-grip movements
- AVOID: Any pressing or pulling that causes pain above shoulder height
- SAFE alternatives: Neutral grip exercises, Cable work with controlled ROM, Front Raises (light), Lower body exercises
- Focus on: Lower body, core, light rehab movements if cleared`);
  }

  // Back injuries
  if (
    injuryLower.includes("back") ||
    injuryLower.includes("spine") ||
    injuryLower.includes("disc") ||
    injuryLower.includes("herniat")
  ) {
    restrictions.push(`
**BACK/SPINE INJURY - CRITICAL RESTRICTIONS:**
- NEVER include: Deadlifts, Bent-over Rows, Good Mornings, Heavy Squats, any spinal loading exercises
- AVOID: Exercises that compress the spine or require spinal flexion/extension under load
- SAFE alternatives: Machine exercises with back support, Leg Press, Chest-supported Rows, Cable exercises
- Focus on: Core stability (planks, bird dogs), supported exercises, light movements`);
  }

  // Wrist/Hand injuries
  if (
    injuryLower.includes("wrist") ||
    injuryLower.includes("hand") ||
    injuryLower.includes("carpal")
  ) {
    restrictions.push(`
**WRIST/HAND INJURY - CRITICAL RESTRICTIONS:**
- NEVER include: Push-ups on hands, Barbell exercises requiring grip, Pull-ups, Hanging exercises
- AVOID: Any exercise requiring strong wrist extension or heavy gripping
- SAFE alternatives: Machine exercises, Forearm-supported exercises, Lower body work, exercises with straps
- Focus on: Lower body, machine-based upper body, minimal grip requirements`);
  }

  // Hip injuries
  if (
    injuryLower.includes("hip") ||
    injuryLower.includes("groin") ||
    injuryLower.includes("labrum")
  ) {
    restrictions.push(`
**HIP INJURY - CRITICAL RESTRICTIONS:**
- NEVER include: Deep Squats, Sumo Deadlifts, Wide-stance exercises, Hip Abduction/Adduction machines
- AVOID: Exercises requiring extreme hip flexion or rotation
- SAFE alternatives: Limited ROM leg exercises, Upper body work, Core exercises avoiding hip flexion
- Focus on: Upper body, gentle hip mobility if cleared, core stability`);
  }

  if (restrictions.length === 0) {
    // Generic injury warning
    restrictions.push(`
**USER HAS REPORTED INJURY: ${injuries.join(", ")}**
- Be conservative with exercise selection
- Avoid exercises that could stress the injured area
- Prioritise exercises that work around the injury
- Include mobility and recovery work`);
  }

  return restrictions.join("\n");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = body.conversationHistory || body.messages || [];

    // Authenticate user via session
    const auth = await getAuthenticatedClient();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { supabase, user } = auth;
    const userId = user.id;

    console.log("=== ONBOARDING CHAT REQUEST ===");
    console.log("User ID:", userId);
    console.log("Message count:", messages.length);

    // Get the last user message
    const lastMessage = messages[messages.length - 1]?.content || "";
    console.log("Last message:", lastMessage);

    // Always use "auto" and let the model decide - it's smarter than regex
    // The system prompt already instructs it to call update_profile immediately
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      tools,
      tool_choice: "auto",
      temperature: 0.5, // Lower temperature for more consistent extraction
    });

    const assistantMessage = response.choices[0].message;
    const toolCalls = assistantMessage.tool_calls;

    console.log("Tool calls:", toolCalls ? toolCalls.length : 0);

    if (toolCalls?.length) {
      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue;

        const functionName = toolCall.function.name;
        let functionArgs: any = {};

        try {
          functionArgs = JSON.parse(toolCall.function.arguments);
        } catch (parseError) {
          console.warn(
            "Failed to parse function arguments:",
            toolCall.function.arguments,
          );
          continue;
        }

        console.log(`✅ ${functionName}:`, functionArgs);

        if (functionName === "update_profile") {
          let equipmentData = functionArgs.equipment_access;
          if (typeof equipmentData === "string") {
            equipmentData = { description: equipmentData };
          }

          // Validate and sanitize the profile data
          const { sanitized, errors } = validateProfileData({
            ...functionArgs,
            equipment_access: equipmentData,
          });

          if (errors.length > 0) {
            console.warn("⚠️ Validation warnings:", errors);
          }

          const updates: Record<string, any> = {
            updated_at: new Date().toISOString(),
            ...sanitized,
          };

          // Remove undefined values
          Object.keys(updates).forEach((key) => {
            if (updates[key] === undefined) delete updates[key];
          });

          console.log("📝 Updating profile with validated data:", updates);

          const { data, error } = await supabase
            .from("profiles")
            .update(updates)
            .eq("id", userId)
            .select();

          if (error) {
            console.error("❌ Supabase error:", error);
          } else {
            console.log("✅ Update successful");
          }
        }

        if (functionName === "complete_onboarding") {
          console.log("🎉 Onboarding complete! Generating workout plan...");

          // Fetch complete profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

          if (!profile) {
            return NextResponse.json({
              message: "Error: Could not load your profile. Please try again.",
              completed: false,
            });
          }

          // Import exercise database helper
          const { generateExerciseContext } = await import("@/lib/exercises");

          // Generate workout plan
          const preferredDays = profile.available_days || [
            "Monday",
            "Wednesday",
            "Friday",
          ];
          const allDays = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ];
          const restDays = allDays.filter((d) => !preferredDays.includes(d));

          // Get equipment list
          const equipmentDesc =
            profile.equipment_access?.description ||
            profile.equipment_access ||
            "full gym";
          const equipmentList = equipmentDesc.toLowerCase().includes("home")
            ? ["dumbbells", "resistance_bands", "none"]
            : equipmentDesc.toLowerCase().includes("none") ||
                equipmentDesc.toLowerCase().includes("bodyweight")
              ? ["none"]
              : [
                  "dumbbells",
                  "barbell",
                  "cables",
                  "machine",
                  "bench",
                  "pull_up_bar",
                ];

          // Generate exercise context based on user profile
          const exerciseContext = generateExerciseContext(
            equipmentList,
            profile.injuries || [],
            profile.fitness_level || "intermediate",
            profile.fitness_goal || "general fitness",
          );

          // Get injury-specific restrictions
          const injuryRestrictions = getInjuryRestrictions(
            profile.injuries || [],
          );

          // Determine training parameters based on goal
          const goalLower = (profile.fitness_goal || "").toLowerCase();
          let repGuidance = "8-12 reps for hypertrophy";
          let restGuidance = "60-90 seconds";
          let setsGuidance = "3-4 sets";

          if (
            goalLower.includes("strength") ||
            goalLower.includes("strong") ||
            goalLower.includes("power")
          ) {
            repGuidance = "3-6 reps for strength";
            restGuidance = "2-3 minutes";
            setsGuidance = "4-5 sets";
          } else if (
            goalLower.includes("endurance") ||
            goalLower.includes("tone") ||
            goalLower.includes("lean") ||
            goalLower.includes("weight loss")
          ) {
            repGuidance = "12-20 reps for endurance/toning";
            restGuidance = "30-60 seconds";
            setsGuidance = "3 sets";
          } else if (
            goalLower.includes("muscle") ||
            goalLower.includes("mass") ||
            goalLower.includes("bulk") ||
            goalLower.includes("hypertrophy")
          ) {
            repGuidance = "8-12 reps for muscle growth";
            restGuidance = "60-90 seconds";
            setsGuidance = "3-4 sets";
          }

          const planPrompt = `Create a scientifically-structured Week 1 workout plan.

USER PROFILE:
- Age: ${profile.age}
- Gender: ${profile.gender}
- Goal: ${profile.fitness_goal}
- Fitness Level: ${profile.fitness_level}
- Preferred Workout Days: ${preferredDays.join(", ")}
- Rest Days: ${restDays.join(", ")}
- Equipment Available: ${equipmentDesc}
- Injuries/Limitations: ${profile.injuries?.length > 0 ? profile.injuries.join(", ") : "None"}

${
  injuryRestrictions
    ? `
## ⚠️ INJURY RESTRICTIONS - MUST FOLLOW ⚠️
${injuryRestrictions}

** YOU MUST NOT INCLUDE ANY EXERCISES LISTED IN THE "NEVER INCLUDE" SECTIONS ABOVE. **
** THIS IS NON-NEGOTIABLE. THE USER HAS A REAL INJURY. **
** DOUBLE-CHECK EVERY EXERCISE BEFORE INCLUDING IT. **
`
    : ""
}

TRAINING PARAMETERS FOR THIS GOAL:
- Rep Range: ${repGuidance}
- Rest Between Sets: ${restGuidance}
- Sets Per Exercise: ${setsGuidance}

${exerciseContext}

## PROGRAMMING PRINCIPLES (follow these for quality workouts)

**Exercise Selection:**
- Start each workout with 1-2 compound movements (squats, deadlifts, bench, rows, overhead press)
- Follow with 2-3 accessory/isolation exercises
- End with core or conditioning work if time allows
- Choose exercises that match their equipment and ability level
${profile.injuries?.length > 0 ? "- **CRITICAL: Re-read the injury restrictions above. Do NOT include any contraindicated exercises.**" : ""}

**Smart Programming:**
- Balance push/pull movements across the week
- Don't train the same muscle group on consecutive days
- ${profile.fitness_level === "beginner" ? "Keep it simple: 4-5 exercises, focus on learning movement patterns" : profile.fitness_level === "advanced" ? "Include intensity techniques: supersets, drop sets where appropriate" : "Build a solid foundation with proper progression"}
- Include mobility work in warmups, not just cardio

**Form Cues (make these specific and helpful):**
- Instead of "keep back straight" → "squeeze your lats and brace your core"
- Instead of "full range of motion" → "go until your thighs are parallel, then drive through your heels"
- Give 1-2 actionable cues per exercise

**Workout Structure:**
- Warmup: 5 min (dynamic stretches or light cardio targeting muscles used)
- Main lifts: Compound exercises, longer rest periods
- Accessories: Isolation work, shorter rest
- Total time: ${profile.fitness_level === "beginner" ? "30-40" : profile.fitness_level === "advanced" ? "50-70" : "40-55"} minutes

SPLIT STRUCTURE for ${preferredDays.length} workout days:
${
  preferredDays.length <= 3
    ? "Full Body each session — hit all major muscle groups"
    : preferredDays.length === 4
      ? "Upper/Lower split — 2 upper days, 2 lower days"
      : preferredDays.length >= 5
        ? "Push/Pull/Legs or Bro Split — dedicated focus areas"
        : ""
}

${
  profile.injuries?.length > 0
    ? `
## FINAL INJURY CHECK
Before returning the plan, verify:
1. Have you excluded ALL exercises from the "NEVER INCLUDE" list?
2. Are all exercises safe for someone with: ${profile.injuries.join(", ")}?
3. Have you provided safe alternatives that work around the injury?

If any exercise could aggravate the injury, REMOVE IT and replace with a safe alternative.
`
    : ""
}

Return a JSON object with ALL 7 days:
{
  "workouts": [
    {
      "day": "Monday",
      "focus": "Upper Body Push",
      "isRestDay": false,
      "duration_minutes": 45,
      "exercises": [
        {
          "name": "Exercise Name",
          "sets": 3,
          "reps": 10,
          "rest_seconds": 90,
          "notes": "Specific form cue that actually helps"
        }
      ]
    },
    {
      "day": "Tuesday",
      "focus": "Rest & Recovery",
      "isRestDay": true,
      "duration_minutes": 0,
      "exercises": []
    }
  ]
}

Return valid JSON only with all 7 days. Create workouts that someone would actually enjoy doing.`;

          const planResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content:
                  "You are an experienced personal trainer who creates effective, enjoyable workout programs. You understand progressive overload, proper exercise selection, and how to match workouts to individual goals. You are extremely careful about injuries and NEVER include exercises that could aggravate an injury. Return only valid JSON.",
              },
              { role: "user", content: planPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
          });

          let workoutPlan;
          try {
            workoutPlan = JSON.parse(
              planResponse.choices[0].message.content || "{}",
            );
          } catch (e) {
            console.error("Failed to parse workout plan");
            return NextResponse.json({
              message: "Error creating your workout plan. Please try again.",
              completed: false,
            });
          }

          // Validate the workout plan
          const { valid, errors, sanitized } = validateWorkoutPlan(workoutPlan);
          if (!valid) {
            console.warn("⚠️ Workout plan validation warnings:", errors);
          }
          if (sanitized) {
            workoutPlan = sanitized;
          }

          // Save workout plan
          const { error: planError } = await supabase
            .from("workout_plans")
            .insert({
              user_id: userId,
              week_number: 1,
              exercises: workoutPlan,
              is_active: true,
              created_at: new Date().toISOString(),
            });

          if (planError) {
            console.error("Failed to save plan:", planError);
            return NextResponse.json({
              message: "Error saving your workout plan. Please try again.",
              completed: false,
            });
          }

          console.log("✅ Workout plan created and validated!");

          // Add injury note to completion message if user has injuries
          const injuryNote =
            profile.injuries?.length > 0
              ? `\n\n⚠️ Your plan has been designed to work around your ${profile.injuries.join(", ")}. Remember to listen to your body and stop any exercise that causes pain.`
              : "";

          return NextResponse.json({
            message: `🎉 Your personalized plan is ready!

I've created a ${profile.available_days?.length || 3}-day workout plan tailored to your ${profile.fitness_goal} goal.

Your plan includes:
${workoutPlan.workouts?.map((w: any) => `• **${w.day}**: ${w.focus} (${w.duration_minutes} min)`).join("\n") || "Custom workouts for your schedule"}${injuryNote}

Click "Go to Dashboard" to see your full plan and start training!`,
            completed: true,
            planCreated: true,
            profileUpdated: true,
          });
        }
      }
    }

    if (!assistantMessage.content && toolCalls?.length) {
      console.log(
        "AI called function but no message. Making follow-up call...",
      );

      const followUpMessages = [
        ...messages,
        {
          role: "assistant" as const,
          tool_calls: toolCalls,
        },
        ...toolCalls.map((toolCall) => ({
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: "Data saved successfully",
        })),
      ];

      const followUpResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...followUpMessages,
        ],
        temperature: 0.7,
      });

      const followUpMessage = followUpResponse.choices[0].message.content;
      console.log("Follow-up response:", followUpMessage);

      return NextResponse.json({
        message: followUpMessage || "Got it! What else can you tell me?",
        completed: false,
        profileUpdated: true,
      });
    }

    return NextResponse.json({
      message: assistantMessage.content || "I'm listening, tell me more!",
      completed: false,
    });
  } catch (error) {
    console.error("❌ Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 },
    );
  }
}
