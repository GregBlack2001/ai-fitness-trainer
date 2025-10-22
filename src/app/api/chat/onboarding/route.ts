import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// --- System prompt ---
const SYSTEM_PROMPT = `You are an enthusiastic and knowledgeable AI fitness coach helping a new user set up their profile.
Collect this info naturally, one question at a time:
1. Full name  2. Age  3. Gender  4. Height (cm)  5. Weight (kg)
6. Fitness goal  7. Fitness level  8. Available days  9. Equipment access 10. Injuries/limitations

Guidelines:
- Be friendly and concise (2–3 sentences max)
- If user provides multiple details, confirm them all
- Extract details naturally from sentences
- When all info is gathered, say “Perfect! I have everything I need. Let me create your personalized plan...” and call complete_onboarding`;

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "save_basic_info",
      description: "Save basic user information",
      parameters: {
        type: "object",
        properties: {
          full_name: { type: "string" },
          age: { type: "number" },
          gender: { type: "string" },
          height_cm: { type: "number" },
          weight_kg: { type: "number" },
        },
        required: ["full_name", "age", "gender", "height_cm", "weight_kg"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_fitness_info",
      description: "Save fitness details",
      parameters: {
        type: "object",
        properties: {
          fitness_goal: { type: "string" },
          fitness_level: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"],
          },
          available_days: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["fitness_goal", "fitness_level"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_equipment_and_injuries",
      description: "Save user equipment and injuries",
      parameters: {
        type: "object",
        properties: {
          equipment_access: { type: "object" },
          injuries: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_onboarding",
      description: "Mark onboarding complete",
      parameters: {
        type: "object",
        properties: { ready: { type: "boolean" } },
        required: ["ready"],
      },
    },
  },
];

export async function POST(request: Request) {
  try {
    const { messages, userId } = await request.json();

    if (!userId)
      return NextResponse.json({ error: "User ID required" }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ⚡ Use GPT-4o-mini for cheaper onboarding chats
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      tools,
      tool_choice: "auto",
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0].message;
    const toolCalls = assistantMessage.tool_calls;

    if (toolCalls?.length) {
      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue;

        const functionName = toolCall.function.name;
        let functionArgs: any = {};

        try {
          functionArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          console.warn(
            "Invalid tool arguments JSON:",
            toolCall.function.arguments
          );
          continue;
        }

        console.log(`Executing: ${functionName}`, functionArgs);

        const updates: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        if (functionName === "save_basic_info") {
          Object.assign(updates, {
            full_name: functionArgs.full_name,
            age: functionArgs.age,
            gender: functionArgs.gender,
            height_cm: functionArgs.height_cm,
            weight_kg: functionArgs.weight_kg,
          });
        }

        if (functionName === "save_fitness_info") {
          Object.assign(updates, {
            fitness_goal: functionArgs.fitness_goal,
            fitness_level: functionArgs.fitness_level,
            available_days: functionArgs.available_days || [],
          });
        }

        if (functionName === "save_equipment_and_injuries") {
          Object.assign(updates, {
            equipment_access: functionArgs.equipment_access || {},
            injuries: functionArgs.injuries || [],
          });
        }

        await supabase.from("profiles").update(updates).eq("id", userId);

        if (functionName === "complete_onboarding") {
          return NextResponse.json({
            message: assistantMessage.content || "Onboarding complete!",
            completed: true,
          });
        }
      }
    }

    return NextResponse.json({
      message: assistantMessage.content,
      completed: false,
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
