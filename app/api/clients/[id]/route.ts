import { NextResponse } from "next/server";
import { requireAgent, getOrCreateAccount } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { updateClientSchema, uuidSchema } from "@/lib/validations/api-schemas";
import { logInvalidInput, logPermissionDenied } from "@/lib/logging/security-events";

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
    
    // UUID 검증
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: "Invalid client ID format" },
        { status: 400 }
      );
    }
    
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

    // 가족 정보 조회
    const { data: familyMembers, error: familyError } = await supabase
      .from("family_members")
      .select("*")
      .eq("client_id", id);

    if (familyError) {
      console.error("[API] Failed to fetch family members:", familyError);
    }

    // 비상연락망 조회
    const { data: emergencyContacts, error: emergencyError } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("client_id", id);

    if (emergencyError) {
      console.error("[API] Failed to fetch emergency contacts:", emergencyError);
    }

    console.log("[API] Client 조회 성공:", {
      clientId: id,
      clientName: client.name,
      familyMembersCount: familyMembers?.length || 0,
      emergencyContactsCount: emergencyContacts?.length || 0,
    });

    return NextResponse.json({
      client,
      familyMembers: familyMembers || [],
      emergencyContacts: emergencyContacts || [],
    });
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
    
    // UUID 검증
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: "Invalid client ID format" },
        { status: 400 }
      );
    }
    
    // Zod 스키마로 입력 검증
    const validationResult = updateClientSchema.safeParse(body);
    if (!validationResult.success) {
      logInvalidInput(`/api/clients/${id}`, validationResult.error.errors);
      return NextResponse.json(
        { 
          error: "Invalid request body",
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      phone,
      occupation,
      moving_date,
      relocation_type,
      moving_type,
      birth_date,
      family_members,
      emergency_contacts,
    } = validationResult.data;

    console.log("[API] 클라이언트 업데이트 데이터:", {
      clientId: id,
      name,
      email,
      occupation,
      moving_date,
      relocation_type,
      moving_type,
      birth_date,
      family_members_count: family_members?.length || 0,
      emergency_contacts_count: emergency_contacts?.length || 0,
    });

    // 클라이언트 업데이트 데이터 준비
    const updateData: any = {
      name,
      email,
      phone_kr: phone || null,
      occupation,
      moving_date,
      relocation_type,
    };

    // moving_type이 있으면 추가 (빈 문자열이 아닌 경우만)
    if (moving_type && moving_type.trim() !== "") {
      updateData.moving_type = moving_type;
    } else {
      updateData.moving_type = null;
    }

    // birth_date 처리
    if (birth_date) {
      updateData.birth_date = birth_date;
    } else {
      updateData.birth_date = null;
    }

    console.log("[API] 클라이언트 업데이트 데이터 (최종):", {
      clientId: id,
      updateData,
    });

    // 클라이언트 업데이트 (소유권 확인)
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", id)
      .eq("owner_agent_id", account.id) // 소유권 확인
      .select()
      .single();

    if (clientError) {
      console.error("[API] Client update error:", {
        clientId: id,
        accountId: account.id,
        error: clientError,
        errorCode: clientError.code,
        errorMessage: clientError.message,
        errorDetails: clientError.details,
        errorHint: clientError.hint,
        updateData,
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
        {
          error: "Failed to update client",
          details: clientError.message || "Unknown error",
          code: clientError.code,
        },
        { status: 500 }
      );
    }

    // 가족 정보 업데이트
    if (family_members && Array.isArray(family_members)) {
      // 기존 가족 정보 삭제
      const { error: deleteFamilyError } = await supabase
        .from("family_members")
        .delete()
        .eq("client_id", id);

      if (deleteFamilyError) {
        console.error("[API] Failed to delete family members:", deleteFamilyError);
      } else {
        // 새 가족 정보 추가
        if (family_members.length > 0) {
          const familyData = family_members.map((member: any) => {
            let birthDate = null;
            if (member.birthDate) {
              try {
                const date = member.birthDate instanceof Date 
                  ? member.birthDate 
                  : new Date(member.birthDate);
                if (!isNaN(date.getTime())) {
                  birthDate = date.toISOString().split("T")[0];
                }
              } catch {
                console.warn("[API] Invalid birth date:", member.birthDate);
              }
            }
            return {
              client_id: id,
              name: member.name,
              relationship: member.relationship,
              birth_date: birthDate,
              phone: member.phone || null,
              email: member.email || null,
              notes: member.notes || null,
            };
          });

          const { error: insertFamilyError } = await supabase
            .from("family_members")
            .insert(familyData);

          if (insertFamilyError) {
            console.error("[API] Failed to insert family members:", insertFamilyError);
          } else {
            console.log("[API] Family members updated:", {
              clientId: id,
              count: family_members.length,
            });
          }
        }
      }
    }

    // 비상연락망 업데이트
    if (emergency_contacts && Array.isArray(emergency_contacts)) {
      // 기존 비상연락망 삭제
      const { error: deleteEmergencyError } = await supabase
        .from("emergency_contacts")
        .delete()
        .eq("client_id", id);

      if (deleteEmergencyError) {
        console.error("[API] Failed to delete emergency contacts:", deleteEmergencyError);
      } else {
        // 새 비상연락망 추가
        if (emergency_contacts.length > 0) {
          const emergencyData = emergency_contacts.map((contact: any) => ({
            client_id: id,
            name: contact.name,
            relationship: contact.relationship,
            phone_kr: contact.phoneKr || null,
            email: contact.email || null,
            kakao_id: contact.kakaoId || null,
          }));

          const { error: insertEmergencyError } = await supabase
            .from("emergency_contacts")
            .insert(emergencyData);

          if (insertEmergencyError) {
            console.error("[API] Failed to insert emergency contacts:", insertEmergencyError);
          } else {
            console.log("[API] Emergency contacts updated:", {
              clientId: id,
              count: emergency_contacts.length,
            });
          }
        }
      }
    }

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

