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

  // 대소문자 구분 없이 체크
  const maintenanceModeValue =
    process.env.MAINTENANCE_MODE?.toLowerCase() || "";
  const isProduction = process.env.NODE_ENV === "production";
  const maintenanceModeActive =
    isProduction &&
    (maintenanceModeValue === "true" || maintenanceModeValue === "1");

  return NextResponse.json(
    {
      NODE_ENV: process.env.NODE_ENV,
      MAINTENANCE_MODE: process.env.MAINTENANCE_MODE,
      maintenanceModeValue,
      isProduction,
      maintenanceModeActive,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}

