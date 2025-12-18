import { NextResponse } from "next/server";

/**
 * @file app/api/debug/env/route.ts
 * @description 환경 변수 디버깅용 API (프로덕션에서만 사용)
 *
 * 이 엔드포인트는 점검 모드가 작동하지 않을 때 환경 변수를 확인하기 위해 사용합니다.
 * 프로덕션에서 사용 후 삭제하거나 보호하는 것을 권장합니다.
 */
export async function GET() {
  // 보안: 프로덕션에서만 접근 가능하도록 (선택사항)
  // if (process.env.NODE_ENV !== "production") {
  //   return NextResponse.json({ error: "Not available in development" }, { status: 403 });
  // }

  return NextResponse.json(
    {
      NODE_ENV: process.env.NODE_ENV,
      MAINTENANCE_MODE: process.env.MAINTENANCE_MODE,
      isProduction: process.env.NODE_ENV === "production",
      maintenanceModeActive:
        process.env.NODE_ENV === "production" &&
        (process.env.MAINTENANCE_MODE === "true" ||
          process.env.MAINTENANCE_MODE === "1"),
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}

