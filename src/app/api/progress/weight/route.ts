import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId, weight_kg } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!weight_kg || weight_kg <= 0) {
      return NextResponse.json(
        { error: "Valid weight is required" },
        { status: 400 }
      );
    }

    console.log("=== LOGGING WEIGHT ===");
    console.log("User ID:", userId);
    console.log("Weight:", weight_kg, "kg");

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Insert weight entry
    const { data: entry, error } = await supabaseAdmin
      .from("weight_logs")
      .insert([
        {
          user_id: userId,
          weight_kg,
          recorded_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ Failed to save weight:", error);

      // If table doesn't exist, provide migration
      if (error.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "Weight logs table not found. Please run the database migration.",
            migration: `
CREATE TABLE weight_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own weight logs" ON weight_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight logs" ON weight_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight logs" ON weight_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_weight_logs_user_id ON weight_logs(user_id);
CREATE INDEX idx_weight_logs_recorded_at ON weight_logs(recorded_at DESC);
            `,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Failed to save weight" },
        { status: 500 }
      );
    }

    console.log("✅ Weight logged:", entry.id);

    // Also update profile with latest weight
    await supabaseAdmin.from("profiles").update({ weight_kg }).eq("id", userId);

    return NextResponse.json({
      success: true,
      entry,
    });
  } catch (error) {
    console.error("❌ Weight log error:", error);
    return NextResponse.json(
      { error: "Failed to log weight" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: entries, error } = await supabaseAdmin
      .from("weight_logs")
      .select("*")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch weight logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch weight logs" },
        { status: 500 }
      );
    }

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Weight fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weight logs" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!entryId || !userId) {
      return NextResponse.json(
        { error: "Entry ID and User ID are required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from("weight_logs")
      .delete()
      .eq("id", entryId)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Weight delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete weight entry" },
      { status: 500 }
    );
  }
}
