import { NextResponse } from "next/server";
import { getAuthUserId, getClientIdForUser } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/client/authorize/status
 * 현재 사용자의 권한 부여 상태를 확인합니다.
 * 
 * 응답:
 * - 권한이 있으면: { hasAuthorization: true, client: {...}, authorization: {...} }
 * - 권한이 없으면: 404
 */
export async function GET(request: Request) {
  try {
    console.log("[API] GET /api/client/authorize/status 호출");

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    // 쿼리 파라미터에서 clientId 가져오기 (관리자용)
    const url = new URL(request.url);
    const clientIdFromQuery = url.searchParams.get("clientId") || undefined;

    // 클라이언트 본인 또는 권한 부여된 사용자의 client_id 조회
    const clientId = await getClientIdForUser(userId, clientIdFromQuery);

    if (!clientId) {
      console.log("[API] 권한 부여 상태 없음:", { userId });
      return NextResponse.json(
        { error: "권한이 부여되지 않았습니다." },
        { status: 404 }
      );
    }

    // 클라이언트 정보 조회
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.error("[API] Client fetch error:", clientError);
      return NextResponse.json(
        { error: "클라이언트 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 본인이 클라이언트인지 확인
    const { data: ownClient } = await supabase
      .from("clients")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    const isOwnClient = !!ownClient;

    // 권한 부여 정보 조회 (권한 부여된 사용자인 경우)
    let authorization = null;
    if (!isOwnClient) {
      const { data: auth, error: authError } = await supabase
        .from("client_authorizations")
        .select("*")
        .eq("authorized_clerk_user_id", userId)
        .eq("client_id", clientId)
        .single();

      if (!authError && auth) {
        authorization = auth;
      }
    }

    console.log("[API] 권한 부여 상태 확인 성공:", {
      userId,
      clientId,
      isOwnClient,
      hasAuthorization: !!authorization,
    });

    return NextResponse.json({
      hasAuthorization: true,
      isOwnClient,
      client: {
        id: client.id,
        name: client.name,
      },
      authorization: authorization
        ? {
            id: authorization.id,
            granted_at: authorization.granted_at,
          }
        : null,
    });
  } catch (error) {
    console.error("[API] Error in GET /api/client/authorize/status:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

