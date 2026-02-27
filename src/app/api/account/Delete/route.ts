import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/server";

export async function DELETE(request: Request) {
  console.log("=== DELETE ACCOUNT API CALLED ===");

  try {
    // Check for required env vars
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json(
        {
          error: "Server configuration error - missing service role key",
        },
        { status: 500 },
      );
    }

    // Authenticate user via session first
    const auth = await getAuthenticatedClient();
    if (!auth) {
      console.log("❌ Not authenticated");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = auth.user.id;

    console.log("✅ Authenticated user:", userId);

    // Create Supabase admin client with service role (needed for auth.admin.deleteUser)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Delete all user data in order (respecting foreign keys)
    console.log("📝 Deleting events...");
    await supabaseAdmin.from("events").delete().eq("user_id", userId);

    console.log("📝 Deleting workout logs...");
    await supabaseAdmin.from("workout_logs").delete().eq("user_id", userId);

    console.log("📝 Deleting weight logs...");
    await supabaseAdmin.from("weight_logs").delete().eq("user_id", userId);

    console.log("📝 Deleting meal plans...");
    await supabaseAdmin.from("meal_plans").delete().eq("user_id", userId);

    // Clear the based_on_checkin reference before deleting checkins
    console.log("📝 Clearing workout plan checkin references...");
    await supabaseAdmin
      .from("workout_plans")
      .update({ based_on_checkin: null })
      .eq("user_id", userId);

    console.log("📝 Deleting weekly check-ins...");
    await supabaseAdmin.from("weekly_checkins").delete().eq("user_id", userId);

    console.log("📝 Deleting workout plans...");
    await supabaseAdmin.from("workout_plans").delete().eq("user_id", userId);

    console.log("📝 Deleting profile...");
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    console.log("📝 Deleting auth user...");
    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("❌ Auth user deletion failed:", authError);
      return NextResponse.json(
        { error: "Failed to delete account", details: authError.message },
        { status: 500 },
      );
    }

    console.log("✅ Account deleted successfully");

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete account error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
