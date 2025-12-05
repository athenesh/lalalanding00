import { NextResponse } from "next/server";
import { getAuthUserId, requireClient } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { updateHousingSchema } from "@/lib/validations/api-schemas";

/**
 * GET /api/client/housing
 * 클라이언트 자신의 주거 요구사항을 조회합니다.
 */
export async function GET() {
  try {
    console.log("[API] GET /api/client/housing 호출");

    // 클라이언트 권한 확인
    await requireClient();

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    // 클라이언트 정보 조회 (clerk_user_id로)
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
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
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch client" },
        { status: 500 },
      );
    }

    // 주거 요구사항 조회
    const { data: housing, error: housingError } = await supabase
      .from("housing_requirements")
      .select("*")
      .eq("client_id", client.id)
      .single();

    if (housingError) {
      if (housingError.code === "PGRST116") {
        // 주거 요구사항이 없음 (새로 생성해야 함)
        console.log("[API] Housing requirements not found, returning empty:", {
          clientId: client.id,
        });
        return NextResponse.json({
          housing: null,
        });
      }
      console.error("[API] Housing fetch error:", {
        clientId: client.id,
        error: housingError,
      });
      return NextResponse.json(
        { error: "Failed to fetch housing requirements" },
        { status: 500 },
      );
    }

    console.log("[API] Housing requirements 조회 성공:", {
      clientId: client.id,
      housingId: housing?.id,
      housingType: housing?.housing_type,
    });

    // housing_type이 배열이 아닌 경우 배열로 변환 (기존 데이터 호환성)
    if (
      housing &&
      housing.housing_type &&
      !Array.isArray(housing.housing_type)
    ) {
      housing.housing_type = [housing.housing_type];
    }

    return NextResponse.json({ housing });
  } catch (error) {
    console.error("[API] Error in GET /api/client/housing:", {
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/client/housing
 * 클라이언트 자신의 주거 요구사항을 업데이트합니다. (없으면 생성)
 */
export async function PATCH(request: Request) {
  try {
    console.log("[API] PATCH /api/client/housing 호출");

    // 클라이언트 권한 확인
    await requireClient();

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    // 클라이언트 정보 조회 (clerk_user_id로)
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (clientError || !client) {
      console.error("[API] Client not found:", { userId, error: clientError });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await request.json();

    // Zod 스키마로 입력 검증
    const validationResult = updateHousingSchema.safeParse(body);
    if (!validationResult.success) {
      console.warn("[API] Invalid request body:", {
        clientId: client.id,
        errors: validationResult.error.errors,
      });
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const {
      preferredArea,
      maxBudget,
      housingType,
      bedrooms,
      bathrooms,
      furnished,
      hasWasherDryer,
      parking,
      parkingCount,
      hasPets,
      petDetails,
      schoolDistrict,
      workplaceAddress,
      additionalNotes,
    } = validationResult.data;

    console.log("[API] 주거 요구사항 업데이트 데이터:", {
      clientId: client.id,
      preferredArea,
      maxBudget,
      housingType,
      bedrooms,
      bathrooms,
      furnished,
      hasWasherDryer,
      parking,
      parkingCount,
      hasPets,
      petDetails,
      schoolDistrict,
      workplaceAddress,
      additionalNotes,
    });

    // 데이터 변환 (UI 필드명 → DB 필드명)
    // housingType은 이미 스키마에서 배열로 변환됨
    const housingTypeArray = housingType;

    console.log("[API] housingType 변환:", {
      original: housingType,
      converted: housingTypeArray,
    });

    // parkingCount는 이미 스키마에서 숫자로 변환됨
    const parkingCountInt = parkingCount;

    const updateData: any = {
      preferred_city: preferredArea || null,
      budget_max: maxBudget,
      housing_type: housingTypeArray,
      bedrooms: bedrooms,
      bathrooms: bathrooms,
      furnished: furnished ?? null,
      has_washer_dryer: hasWasherDryer ?? null,
      parking: parking ?? null,
      parking_count: parkingCountInt,
      has_pets: hasPets ?? null,
      pet_details: petDetails || null,
      school_district: schoolDistrict ?? null,
      workplace_address: workplaceAddress || null,
      additional_notes: additionalNotes || null,
      updated_at: new Date().toISOString(),
    };

    // 기존 주거 요구사항 조회
    const { data: existingHousing } = await supabase
      .from("housing_requirements")
      .select("id")
      .eq("client_id", client.id)
      .single();

    let housing;

    if (existingHousing) {
      // 업데이트
      const { data: updatedHousing, error: updateError } = await supabase
        .from("housing_requirements")
        .update(updateData)
        .eq("id", existingHousing.id)
        .select()
        .single();

      if (updateError) {
        console.error("[API] Housing update error:", {
          clientId: client.id,
          error: updateError,
        });
        return NextResponse.json(
          { error: "Failed to update housing requirements" },
          { status: 500 },
        );
      }

      housing = updatedHousing;
    } else {
      // 생성
      const { data: newHousing, error: insertError } = await supabase
        .from("housing_requirements")
        .insert({
          client_id: client.id,
          ...updateData,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[API] Housing insert error:", {
          clientId: client.id,
          error: insertError,
        });
        return NextResponse.json(
          { error: "Failed to create housing requirements" },
          { status: 500 },
        );
      }

      housing = newHousing;
    }

    console.log("[API] Housing requirements 업데이트 성공:", {
      clientId: client.id,
      housingId: housing.id,
    });

    return NextResponse.json({ housing });
  } catch (error) {
    console.error("[API] Error in PATCH /api/client/housing:", {
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
