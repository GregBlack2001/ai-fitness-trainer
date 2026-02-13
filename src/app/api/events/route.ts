import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { eventType, metadata } = await request.json();

    if (!eventType) {
      return NextResponse.json(
        { error: "Event type required" },
        { status: 400 },
      );
    }

    // Authenticate user via session
    const auth = await getAuthenticatedClient();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { supabase, user } = auth;

    // Insert event (RLS enforces user_id = auth.uid())
    const { error } = await supabase.from("events").insert({
      user_id: user.id,
      event_type: eventType,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to log event:", error);
      return NextResponse.json(
        { error: "Failed to log event" },
        { status: 500 },
      );
    }

    console.log(
      `📊 Event logged: ${eventType} for user ${user.id.slice(0, 8)}...`,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Event API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET endpoint to retrieve events for the authenticated user
export async function GET(request: Request) {
  try {
    // Authenticate user via session
    const auth = await getAuthenticatedClient();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { supabase, user } = auth;

    // Fetch events (RLS enforces user_id = auth.uid())
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events: data });
  } catch (error) {
    console.error("Event GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
