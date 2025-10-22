import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const SYSTEM_PROMPT = `You are an AI fitness coach. Your ONLY job is to:
1. Ask the user for information
2. Call update_profile with ANY data they provide
3. Ask the next question

YOU MUST call update_profile every single time the user gives you information.

Example:
User: "I weigh 75kg"
You: Call update_profile(weight_kg=75) AND say "Got it! What's your fitness goal?"

Required data to collect:
- full_name (string)
- age (number)
- gender (string)  
- height_cm (number - height in centimeters)
- weight_kg (number - weight in kilograms)
- fitness_goal (string - e.g., "lose weight", "build muscle")
- fitness_level (string - must be "beginner", "intermediate", or "advanced")
- available_days (array of day names - e.g., ["Monday", "Wednesday", "Friday"])
- equipment_access (string - description of available equipment)
- injuries (array of strings - list any injuries, or empty array if none)

After getting ALL data, call complete_onboarding.`;

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
          available_days: { type: "array", items: { type: "string" } },
          equipment_access: { type: "string" },
          injuries: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_onboarding",
      description: "Call when ALL information is collected",
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

    console.log("=== ONBOARDING CHAT REQUEST ===");
    console.log("User ID:", userId);
    console.log("Message count:", messages.length);

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the last user message
    const lastMessage = messages[messages.length - 1]?.content || "";

    // Detect if user likely provided data (contains numbers or keywords)
    const seemsLikeData =
      /\d+|kg|cm|tall|weigh|male|female|man|woman|beginner|intermediate|advanced|monday|tuesday|wednesday|thursday|friday|saturday|sunday|gym|dumbbell|barbell|equipment|injury|injure/i.test(
        lastMessage
      );

    console.log("Last message:", lastMessage);
    console.log("Seems like data?", seemsLikeData);

    // Choose tool behavior based on whether message contains data
    let toolChoice: any = "auto";
    if (seemsLikeData && messages.length > 1) {
      // Don't force on first message
      toolChoice = { type: "function", function: { name: "update_profile" } };
      console.log("🔧 Forcing update_profile function call");
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      tools,
      tool_choice: toolChoice,
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0].message;
    const toolCalls = assistantMessage.tool_calls;

    console.log("Tool calls:", toolCalls ? toolCalls.length : 0);

    // Handle function calls
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
            toolCall.function.arguments
          );
          continue;
        }

        console.log(`✅ ${functionName}:`, functionArgs);

        if (functionName === "update_profile") {
          // Convert equipment_access string to JSON if needed
          let equipmentData = functionArgs.equipment_access;
          if (typeof equipmentData === "string") {
            equipmentData = { description: equipmentData };
          }

          // Only include fields that were actually provided
          const updates: Record<string, any> = {
            updated_at: new Date().toISOString(),
          };

          // Only add fields that have values
          if (functionArgs.full_name)
            updates.full_name = functionArgs.full_name;
          if (functionArgs.age) updates.age = functionArgs.age;
          if (functionArgs.gender) updates.gender = functionArgs.gender;
          if (functionArgs.height_cm)
            updates.height_cm = functionArgs.height_cm;
          if (functionArgs.weight_kg)
            updates.weight_kg = functionArgs.weight_kg;
          if (functionArgs.fitness_goal)
            updates.fitness_goal = functionArgs.fitness_goal;
          if (functionArgs.fitness_level)
            updates.fitness_level = functionArgs.fitness_level;
          if (functionArgs.available_days)
            updates.available_days = functionArgs.available_days;
          if (equipmentData) updates.equipment_access = equipmentData;
          if (functionArgs.injuries) updates.injuries = functionArgs.injuries;

          console.log("📝 Updating profile with:", updates);

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
          console.log("🎉 Onboarding complete!");
          return NextResponse.json({
            message:
              assistantMessage.content ||
              "Perfect! I have everything I need. Let me create your personalized plan...",
            completed: true,
          });
        }
      }
    }

    // If AI called a function but didn't provide a message,
    // make another call to get the actual response
    if (!assistantMessage.content && toolCalls?.length) {
      console.log(
        "⚠️ AI called function but no message. Making follow-up call..."
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
      { status: 500 }
    );
  }
}
