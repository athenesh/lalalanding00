import { NextResponse } from "next/server";
import { requireAgent, getOrCreateAccount } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/clients/[id]
 * 클라이언트 상세 정보를 조회합니다.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // API 호출 시작 로그
    console.log("[API] GET /api/clients/[id] 호출:", { clientId: id });

    // 에이전트 권한 확인
    await requireAgent();

    const supabase = createClerkSupabaseClient();

    // Account 조회 또는 자동 생성
    const account = await getOrCreateAccount();

    // 클라이언트 상세 정보 조회 (소유권 확인)
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .eq("owner_agent_id", account.id)
      .single();

    if (clientError) {
      console.error("[API] Client fetch error:", {
        clientId: id,
        accountId: account.id,
        error: clientError,
      });
      if (clientError.code === "PGRST116") {
        // 클라이언트를 찾을 수 없음
        console.warn("[API] Client not found:", { clientId: id });
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch client" },
        { status: 500 }
      );
    }

    console.log("[API] Client 조회 성공:", {
      clientId: id,
      clientName: client.name,
    });

    return NextResponse.json({ client });
  } catch (error) {
    const { id } = await params;
    console.error("[API] Error in GET /api/clients/[id]:", {
      clientId: id,
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/clients/[id]
 * 클라이언트 정보를 수정합니다.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // API 호출 시작 로그
    console.log("[API] PATCH /api/clients/[id] 호출:", { clientId: id });

    // 에이전트 권한 확인
    await requireAgent();

    const supabase = createClerkSupabaseClient();

    // Account 조회 또는 자동 생성
    const account = await getOrCreateAccount();

    const body = await request.json();
    const { name, email, phone, occupation, moving_date, relocation_type, birth_date } = body;

    // 유효성 검사
    if (!name || !email || !occupation || !moving_date || !relocation_type) {
      console.warn("[API] Missing required fields:", {
        clientId: id,
        body,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("[API] 클라이언트 업데이트 데이터:", {
      clientId: id,
      name,
      email,
      occupation,
      moving_date,
      relocation_type,
      birth_date,
    });

    // 클라이언트 업데이트 (소유권 확인)
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .update({
        name,
        email,
        phone: phone || null,
        occupation,
        moving_date,
        relocation_type,
        birth_date: birth_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("owner_agent_id", account.id) // 소유권 확인
      .select()
      .single();

    if (clientError) {
      console.error("[API] Client update error:", {
        clientId: id,
        accountId: account.id,
        error: clientError,
      });
      if (clientError.code === "PGRST116") {
        // 클라이언트를 찾을 수 없음
        console.warn("[API] Client not found for update:", { clientId: id });
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to update client" },
        { status: 500 }
      );
    }

    console.log("[API] Client 업데이트 성공:", {
      clientId: id,
      clientName: client.name,
    });

    return NextResponse.json({ client });
  } catch (error) {
    const { id } = await params;
    console.error("[API] Error in PATCH /api/clients/[id]:", {
      clientId: id,
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

