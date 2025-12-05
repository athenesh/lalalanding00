import { NextResponse } from "next/server";
import { getAuthUserId, requireClient } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/client/profile
 * 클라이언트 자신의 프로필 정보를 조회합니다.
 */
export async function GET() {
  try {
    console.log("[API] GET /api/client/profile 호출");

    // 클라이언트 권한 확인
    await requireClient();

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    // 클라이언트 정보 조회 (clerk_user_id로)
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (clientError) {
      console.error("[API] Client fetch error:", {
        userId,
        error: clientError,
      });
      if (clientError.code === "PGRST116") {
        // 클라이언트를 찾을 수 없음
        console.warn("[API] Client not found:", { userId });
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
      .eq("client_id", client.id);

    if (familyError) {
      console.error("[API] Failed to fetch family members:", familyError);
    }

    // 비상연락망 조회
    const { data: emergencyContacts, error: emergencyError } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("client_id", client.id);

    if (emergencyError) {
      console.error("[API] Failed to fetch emergency contacts:", emergencyError);
    }

    console.log("[API] Client profile 조회 성공:", {
      clientId: client.id,
      familyMembersCount: familyMembers?.length || 0,
      emergencyContactsCount: emergencyContacts?.length || 0,
    });

    return NextResponse.json({
      client,
      familyMembers: familyMembers || [],
      emergencyContacts: emergencyContacts || [],
    });
  } catch (error) {
    console.error("[API] Error in GET /api/client/profile:", {
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/client/profile
 * 클라이언트 자신의 프로필 정보를 수정합니다.
 */
export async function PATCH(request: Request) {
  try {
    console.log("[API] PATCH /api/client/profile 호출");

    // 클라이언트 권한 확인
    await requireClient();

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    // 클라이언트 정보 조회 (clerk_user_id로)
    const { data: existingClient, error: fetchError } = await supabase
      .from("clients")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (fetchError || !existingClient) {
      console.error("[API] Client not found:", { userId, error: fetchError });
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
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
    } = body;

    // 유효성 검사
    if (!name || !email || !occupation || !moving_date || !relocation_type) {
      console.warn("[API] Missing required fields:", {
        clientId: existingClient.id,
        body,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("[API] 클라이언트 프로필 업데이트 데이터:", {
      clientId: existingClient.id,
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
      clientId: existingClient.id,
      updateData,
    });

    // 클라이언트 업데이트
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", existingClient.id)
      .select()
      .single();

    if (clientError) {
      console.error("[API] Client update error:", {
        clientId: existingClient.id,
        error: clientError,
        errorCode: clientError.code,
        errorMessage: clientError.message,
        errorDetails: clientError.details,
        errorHint: clientError.hint,
        updateData: {
          name,
          email,
          phone_kr: phone || null,
          occupation,
          moving_date,
          relocation_type,
          moving_type: moving_type || null,
          birth_date: birth_date || null,
        },
      });
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
        .eq("client_id", existingClient.id);

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
              client_id: existingClient.id,
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
              clientId: existingClient.id,
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
        .eq("client_id", existingClient.id);

      if (deleteEmergencyError) {
        console.error("[API] Failed to delete emergency contacts:", deleteEmergencyError);
      } else {
        // 새 비상연락망 추가
        if (emergency_contacts.length > 0) {
          const emergencyData = emergency_contacts.map((contact: any) => ({
            client_id: existingClient.id,
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
              clientId: existingClient.id,
              count: emergency_contacts.length,
            });
          }
        }
      }
    }

    console.log("[API] Client profile 업데이트 성공:", {
      clientId: existingClient.id,
      clientName: client.name,
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error("[API] Error in PATCH /api/client/profile:", {
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

