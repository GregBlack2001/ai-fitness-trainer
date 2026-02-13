import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/server";

export async function DELETE(request: Request) {
  try {
    // Authenticate user via session first
    const auth = await getAuthenticatedClient();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = auth.user.id;

    console.log("=== DELETING ACCOUNT ===");
    console.log("User ID:", userId);

    // Create Supabase admin client with service role (needed for auth.admin.deleteUser)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Delete all user data in order (respecting foreign keys)
    // 1. Delete events
    await supabaseAdmin.from("events").delete().eq("user_id", userId);

    // 2. Delete weekly check-ins
    await supabaseAdmin.from("weekly_checkins").delete().eq("user_id", userId);

    // 3. Delete weight logs
    await supabaseAdmin.from("weight_logs").delete().eq("user_id", userId);

    // 4. Delete workout logs
    await supabaseAdmin.from("workout_logs").delete().eq("user_id", userId);

    // 5. Delete meal plans
    await supabaseAdmin.from("meal_plans").delete().eq("user_id", userId);

    // 6. Delete workout plans
    await supabaseAdmin.from("workout_plans").delete().eq("user_id", userId);

    // 7. Delete profile
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // 8. Delete the auth user
    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("❌ Auth user deletion failed:", authError);
      return NextResponse.json(
        { error: "Failed to delete account" },
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
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }
}
