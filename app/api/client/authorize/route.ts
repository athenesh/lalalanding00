import { NextResponse } from "next/server";
import { getAuthUserId, requireClient } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * POST /api/client/authorize
 * 배우자에게 클라이언트 데이터 접근 권한을 부여합니다.
 * 
 * Request Body:
 * {
 *   email: string; // 배우자의 이메일 주소
 * }
 */
export async function POST(request: Request) {
  try {
    console.log("[API] POST /api/client/authorize 호출");

    // 클라이언트 권한 확인
    await requireClient();

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    // 요청 본문 파싱
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "이메일 주소가 필요합니다." },
        { status: 400 }
      );
    }

    // 현재 클라이언트 정보 조회
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (clientError || !client) {
      console.error("[API] Client fetch error:", clientError);
      return NextResponse.json(
        { error: "클라이언트 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    console.log("[API] 권한 부여 대상 클라이언트:", {
      clientId: client.id,
      userId,
    });

    // Clerk에서 이메일로 사용자 검색
    const clerk = await clerkClient();
    let authorizedClerkUserId: string | null = null;

    try {
      // Clerk API를 사용하여 이메일로 사용자 검색
      // getUsersList API는 이메일 주소로 필터링 가능
      const users = await clerk.users.getUserList({
        emailAddress: [email],
        limit: 1,
      });

      if (users.data && users.data.length > 0) {
        authorizedClerkUserId = users.data[0].id;
        console.log("[API] Clerk 사용자 찾음:", {
          email,
          clerkUserId: authorizedClerkUserId,
        });
      } else {
        console.warn("[API] Clerk에서 사용자를 찾을 수 없음:", { email });
        return NextResponse.json(
          {
            error: "해당 이메일로 가입된 사용자를 찾을 수 없습니다.",
            details: "배우자가 먼저 회원가입을 완료해야 합니다.",
          },
          { status: 404 }
        );
      }
    } catch (clerkError) {
      console.error("[API] Clerk 사용자 검색 실패:", clerkError);
      return NextResponse.json(
        { error: "사용자 검색 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    if (!authorizedClerkUserId) {
      return NextResponse.json(
        { error: "권한을 부여할 사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 본인에게 권한을 부여하려는 경우 방지
    if (authorizedClerkUserId === userId) {
      return NextResponse.json(
        { error: "본인에게는 권한을 부여할 수 없습니다." },
        { status: 400 }
      );
    }

    // 클라이언트가 이미 다른 배우자에게 권한을 부여했는지 확인
    // 하나의 배우자에게만 권한 부여 가능
    const { data: existingAuthorizations, error: existingAuthError } =
      await supabase
        .from("client_authorizations")
        .select("id, authorized_clerk_user_id")
        .eq("client_id", client.id);

    if (existingAuthorizations && existingAuthorizations.length > 0) {
      // 이미 다른 사용자에게 권한이 부여되어 있는지 확인
      const hasOtherAuthorization = existingAuthorizations.some(
        (auth) => auth.authorized_clerk_user_id !== authorizedClerkUserId
      );

      if (hasOtherAuthorization) {
        console.log("[API] 이미 다른 배우자에게 권한이 부여되어 있음:", {
          clientId: client.id,
          existingAuthorizations: existingAuthorizations.map(
            (a) => a.authorized_clerk_user_id
          ),
          requestedUserId: authorizedClerkUserId,
        });
        return NextResponse.json(
          {
            error:
              "이미 다른 배우자에게 권한이 부여되어 있습니다. 기존 권한을 해제한 후 다시 시도해주세요.",
          },
          { status: 409 }
        );
      }
    }

    // 이미 같은 사용자에게 권한이 부여되어 있는지 확인
    const { data: existingAuth, error: checkError } = await supabase
      .from("client_authorizations")
      .select("id")
      .eq("client_id", client.id)
      .eq("authorized_clerk_user_id", authorizedClerkUserId)
      .single();

    if (existingAuth && !checkError) {
      console.log("[API] 이미 권한이 부여되어 있음:", {
        authorizationId: existingAuth.id,
      });
      return NextResponse.json(
        {
          message: "이미 권한이 부여되어 있습니다.",
          authorization: existingAuth,
        },
        { status: 200 }
      );
    }

    // 권한 부여 레코드 생성
    const { data: authorization, error: insertError } = await supabase
      .from("client_authorizations")
      .insert({
        client_id: client.id,
        authorized_clerk_user_id: authorizedClerkUserId,
        granted_by_clerk_user_id: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[API] 권한 부여 실패:", insertError);
      
      // 중복 키 에러 처리
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "이미 권한이 부여되어 있습니다." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "권한 부여에 실패했습니다.", details: insertError.message },
        { status: 500 }
      );
    }

    console.log("[API] 권한 부여 성공:", {
      authorizationId: authorization.id,
      clientId: client.id,
      authorizedUserId: authorizedClerkUserId,
    });

    return NextResponse.json({
      success: true,
      authorization,
      message: "권한이 성공적으로 부여되었습니다.",
    });
  } catch (error) {
    console.error("[API] Error in POST /api/client/authorize:", error);
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
 * DELETE /api/client/authorize
 * 부여한 권한을 해제합니다.
 * 
 * Request Body:
 * {
 *   authorized_clerk_user_id: string; // 권한을 해제할 사용자의 Clerk User ID
 * }
 */
export async function DELETE(request: Request) {
  try {
    console.log("[API] DELETE /api/client/authorize 호출");

    // 클라이언트 권한 확인
    await requireClient();

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    // 요청 본문 파싱
    const body = await request.json();
    const { authorized_clerk_user_id } = body;

    if (!authorized_clerk_user_id || typeof authorized_clerk_user_id !== "string") {
      return NextResponse.json(
        { error: "권한을 해제할 사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 현재 클라이언트 정보 조회
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (clientError || !client) {
      console.error("[API] Client fetch error:", clientError);
      return NextResponse.json(
        { error: "클라이언트 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 권한 부여 레코드 삭제 (본인이 부여한 권한만 삭제 가능)
    const { error: deleteError } = await supabase
      .from("client_authorizations")
      .delete()
      .eq("client_id", client.id)
      .eq("authorized_clerk_user_id", authorized_clerk_user_id)
      .eq("granted_by_clerk_user_id", userId); // 본인이 부여한 권한만 삭제 가능

    if (deleteError) {
      console.error("[API] 권한 해제 실패:", deleteError);
      return NextResponse.json(
        { error: "권한 해제에 실패했습니다.", details: deleteError.message },
        { status: 500 }
      );
    }

    console.log("[API] 권한 해제 성공:", {
      clientId: client.id,
      authorizedUserId: authorized_clerk_user_id,
    });

    return NextResponse.json({
      success: true,
      message: "권한이 성공적으로 해제되었습니다.",
    });
  } catch (error) {
    console.error("[API] Error in DELETE /api/client/authorize:", error);
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
 * GET /api/client/authorize
 * 현재 클라이언트에 부여된 권한 목록을 조회합니다.
 */
export async function GET(request: Request) {
  try {
    console.log("[API] GET /api/client/authorize 호출");

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    // 관리자 권한 확인
    const { isAdmin } = await import("@/lib/auth");
    const adminCheck = await isAdmin();

    // 쿼리 파라미터에서 clientId 가져오기 (관리자용)
    const url = new URL(request.url);
    const clientIdFromQuery = url.searchParams.get("clientId") || undefined;

    let clientId: string | null = null;

    if (adminCheck && clientIdFromQuery) {
      // 관리자가 쿼리 파라미터로 clientId를 지정한 경우
      clientId = clientIdFromQuery;
    } else {
      // 클라이언트 권한 확인 (관리자가 아닌 경우)
      if (!adminCheck) {
        const role = await (await import("@/lib/auth")).getAuthRole();
        if (role !== "client") {
          return NextResponse.json(
            { error: "Unauthorized" },
            { status: 403 }
          );
        }
      }

      // 현재 클라이언트 정보 조회
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("clerk_user_id", userId)
        .single();

      if (clientError || !client) {
        // 관리자인 경우 첫 번째 클라이언트 사용
        if (adminCheck) {
          const { data: firstClient } = await supabase
            .from("clients")
            .select("id")
            .limit(1)
            .single();
          if (firstClient) {
            clientId = firstClient.id;
          }
        }

        if (!clientId) {
          console.error("[API] Client fetch error:", clientError);
          return NextResponse.json(
            { error: "클라이언트 정보를 찾을 수 없습니다." },
            { status: 404 }
          );
        }
      } else {
        clientId = client.id;
      }
    }

    // clientId 검증
    if (!clientId) {
      return NextResponse.json(
        { error: "클라이언트 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 권한 부여 목록 조회
    const { data: authorizations, error: fetchError } = await supabase
      .from("client_authorizations")
      .select("*")
      .eq("client_id", clientId)
      .order("granted_at", { ascending: false });

    if (fetchError) {
      console.error("[API] 권한 목록 조회 실패:", fetchError);
      return NextResponse.json(
        { error: "권한 목록을 불러오는데 실패했습니다." },
        { status: 500 }
      );
    }

    console.log("[API] 권한 목록 조회 성공:", {
      clientId: clientId,
      count: authorizations?.length || 0,
    });

    return NextResponse.json({
      success: true,
      authorizations: authorizations || [],
    });
  } catch (error) {
    console.error("[API] Error in GET /api/client/authorize:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
