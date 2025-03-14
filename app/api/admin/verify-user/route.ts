import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";

export async function POST(request: NextRequest) {
  try {
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Unauthorized: You must be logged in" },
        { status: 401 }
      );
    }

    // Check if the current user is an admin
    const { data: currentUser, error: currentUserError } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();
    
    if (currentUserError || !currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can verify users" },
        { status: 403 }
      );
    }

    // Get the user ID to verify from the request body
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Bad Request: User ID is required" },
        { status: 400 }
      );
    }

    // Update the user's is_verified status
    const { error: updateError } = await supabase
      .from("users")
      .update({ is_verified: true })
      .eq("id", userId);
    
    if (updateError) {
      console.error("Error verifying user:", updateError);
      return NextResponse.json(
        { error: "Failed to verify user" },
        { status: 500 }
      );
    }

    // Get the updated user data
    const { data: updatedUser, error: getUserError } = await supabase
      .from("users")
      .select("name, email, is_verified")
      .eq("id", userId)
      .single();
    
    if (getUserError) {
      console.error("Error getting updated user:", getUserError);
    }

    return NextResponse.json({
      message: "User verified successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Error in verify-user API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 