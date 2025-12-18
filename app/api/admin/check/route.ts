import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

/**
 * GET /api/admin/check
 * 현재 사용자가 관리자인지 확인합니다.
 * 클라이언트 사이드에서 관리자 여부를 확인할 때 사용합니다.
 */
export async function GET() {
  try {
    const admin = await isAdmin();
    
    return NextResponse.json({
      isAdmin: admin,
    });
  } catch (error) {
    console.error("[API] Error in GET /api/admin/check:", error);
    return NextResponse.json(
      {
        isAdmin: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

