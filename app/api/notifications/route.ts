import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/notifications
 * 사용자의 알림 목록을 조회합니다.
 */
export async function GET(request: Request) {
  try {
    console.log("[API] GET /api/notifications 호출 시작");

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    // 쿼리 구성
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_clerk_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error("[API] Notifications 조회 실패:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch notifications",
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log("[API] Notifications 조회 성공:", {
      count: notifications?.length || 0,
      unreadOnly,
    });

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
    });
  } catch (error) {
    console.error("[API] Error in GET /api/notifications:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * 알림을 읽음 처리합니다.
 */
export async function PATCH(request: Request) {
  try {
    console.log("[API] PATCH /api/notifications 호출 시작");

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    const body = await request.json();
    const { notificationId, markAllAsRead } = body;

    if (markAllAsRead) {
      // 모든 알림 읽음 처리
      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("user_clerk_id", userId)
        .eq("is_read", false);

      if (error) {
        console.error("[API] 알림 읽음 처리 실패:", error);
        return NextResponse.json(
          {
            error: "Failed to mark notifications as read",
            details: error.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId is required" },
        { status: 400 }
      );
    }

    // 단일 알림 읽음 처리
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("user_clerk_id", userId);

    if (error) {
      console.error("[API] 알림 읽음 처리 실패:", error);
      return NextResponse.json(
        {
          error: "Failed to mark notification as read",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error in PATCH /api/notifications:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

