import { createClient } from "@supabase/supabase-js";

// Event types for tracking user engagement and adherence
export type EventType =
  | "signup_completed"
  | "onboarding_started"
  | "onboarding_completed"
  | "plan_generated"
  | "plan_viewed"
  | "workout_started"
  | "workout_completed"
  | "workout_skipped"
  | "exercise_logged"
  | "checkin_submitted"
  | "plan_updated"
  | "coach_message_sent"
  | "coach_message_received"
  | "voice_used"
  | "nutrition_plan_generated"
  | "nutrition_plan_viewed"
  | "weight_logged"
  | "progress_viewed";

export interface EventMetadata {
  [key: string]: any;
}

/**
 * Log an event to the events table for analytics and adherence tracking
 * Uses service role to bypass RLS for reliable logging
 */
export async function logEvent(
  userId: string,
  eventType: EventType,
  metadata: EventMetadata = {},
): Promise<boolean> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error } = await supabase.from("events").insert({
      user_id: userId,
      event_type: eventType,
      metadata,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to log event:", error);
      return false;
    }

    console.log(
      `📊 Event logged: ${eventType} for user ${userId.slice(0, 8)}...`,
    );
    return true;
  } catch (err) {
    console.error("Event logging error:", err);
    return false;
  }
}

/**
 * Client-side event logging (calls API route)
 */
export async function logEventClient(
  eventType: EventType,
  metadata: EventMetadata = {},
): Promise<boolean> {
  try {
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, metadata }),
    });

    return response.ok;
  } catch (err) {
    console.error("Client event logging error:", err);
    return false;
  }
}
