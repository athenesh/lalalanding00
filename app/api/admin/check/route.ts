import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

/**
 * GET /api/admin/check
 * 현재 사용자가 관리자인지 확인합니다.
 * 클라이언트 사이드에서 관리자 여부를 확인할 때 사용합니다.
 */
export async function GET() {
  try {
    console.log("[API] GET /api/admin/check 호출 시작");
    
    // 환경 변수 확인
    const adminEmail = process.env.ADMIN_EMAIL;
    console.log("[API] ADMIN_EMAIL 환경 변수:", adminEmail ? "설정됨" : "설정되지 않음");
    
    const admin = await isAdmin();
    
    // 디버깅을 위한 상세 정보
    const debugInfo: any = {
      isAdmin: admin,
      adminEmailConfigured: !!adminEmail,
    };
    
    // 개발 환경에서만 상세 정보 반환
    if (process.env.NODE_ENV === "development") {
      debugInfo.adminEmail = adminEmail;
    }
    
    console.log("[API] 관리자 확인 결과:", debugInfo);
    
    return NextResponse.json(debugInfo);
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

