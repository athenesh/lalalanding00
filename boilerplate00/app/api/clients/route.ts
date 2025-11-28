import { NextResponse } from "next/server";
import { getAuthUserId, getAuthRole, requireAgent } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * GET /api/clients
 * 에이전트의 클라이언트 목록을 조회합니다.
 */
export async function GET() {
  try {
    // 에이전트 권한 확인
    await requireAgent();

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    // accounts 테이블에서 현재 사용자의 account ID 조회
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !account) {
      console.error("Account lookup error:", accountError);
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // 클라이언트 목록 조회 (체크리스트 완료율 포함)
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select(
        `
        id,
        name,
        email,
        phone,
        occupation,
        moving_date,
        created_at,
        updated_at,
        checklist_items (
          id,
          is_completed
        )
      `
      )
      .eq("owner_agent_id", account.id)
      .order("created_at", { ascending: false });

    if (clientsError) {
      console.error("Clients fetch error:", clientsError);
      return NextResponse.json(
        { error: "Failed to fetch clients" },
        { status: 500 }
      );
    }

    // 체크리스트 완료율 계산
    const clientsWithProgress = clients?.map((client) => {
      const checklistItems = client.checklist_items || [];
      const totalItems = checklistItems.length;
      const completedItems = checklistItems.filter(
        (item: any) => item.is_completed
      ).length;
      const completionRate =
        totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        occupation: client.occupation,
        moving_date: client.moving_date,
        created_at: client.created_at,
        updated_at: client.updated_at,
        checklist_completion_rate: Math.round(completionRate),
      };
    });

    return NextResponse.json({
      clients: clientsWithProgress || [],
    });
  } catch (error) {
    console.error("Error in GET /api/clients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients
 * 새 클라이언트를 생성합니다.
 */
export async function POST(request: Request) {
  try {
    // 에이전트 권한 확인
    await requireAgent();

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    // accounts 테이블에서 현재 사용자의 account ID 조회
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !account) {
      console.error("Account lookup error:", accountError);
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, email, phone, occupation, moving_date } = body;

    // 유효성 검사
    if (!name || !email || !occupation || !moving_date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 클라이언트 생성
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({
        owner_agent_id: account.id,
        name,
        email,
        phone: phone || null,
        occupation,
        moving_date,
      })
      .select()
      .single();

    if (clientError) {
      console.error("Client creation error:", clientError);
      return NextResponse.json(
        { error: "Failed to create client" },
        { status: 500 }
      );
    }

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/clients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

