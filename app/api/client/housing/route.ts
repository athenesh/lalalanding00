import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getClientIdForUser } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { updateHousingSchema } from "@/lib/validations/api-schemas";

/**
 * GET /api/client/housing
 * 클라이언트 자신의 주거 요구사항을 조회합니다.
 * 권한 부여된 사용자도 접근 가능합니다.
 */
export async function GET() {
  try {
    console.log("[API] GET /api/client/housing 호출");

    // 인증 확인 (리다이렉트 없이)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const supabase = createClerkSupabaseClient();

    // 클라이언트 본인 또는 권한 부여된 사용자의 client_id 조회
    const clientId = await getClientIdForUser(userId);

    if (!clientId) {
      console.log("[API] 클라이언트 또는 권한 부여된 사용자가 아님");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 주거 요구사항 조회
    const { data: housing, error: housingError } = await supabase
      .from("housing_requirements")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (housingError) {
      if (housingError.code === "PGRST116") {
        // 주거 요구사항이 없음 (새로 생성해야 함)
        console.log("[API] Housing requirements not found, returning empty:", {
          clientId,
        });
        return NextResponse.json({
          housing: null,
        });
      }
      console.error("[API] Housing fetch error:", {
        clientId,
        error: housingError,
      });
      return NextResponse.json(
        { error: "Failed to fetch housing requirements" },
        { status: 500 },
      );
    }

    console.log("[API] Housing requirements 조회 성공:", {
      clientId,
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
 * 권한 부여된 사용자도 수정 가능합니다.
 */
export async function PATCH(request: Request) {
  try {
    console.log("[API] PATCH /api/client/housing 호출");

    // 인증 확인 (리다이렉트 없이)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClerkSupabaseClient();

    // 클라이언트 본인 또는 권한 부여된 사용자의 client_id 조회
    const clientId = await getClientIdForUser(userId);

    if (!clientId) {
      console.log("[API] 클라이언트 또는 권한 부여된 사용자가 아님");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Zod 스키마로 입력 검증
    const validationResult = updateHousingSchema.safeParse(body);
    if (!validationResult.success) {
      console.warn("[API] Invalid request body:", {
        clientId,
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
      clientId,
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
      .eq("client_id", clientId)
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
          clientId,
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
          client_id: clientId,
          ...updateData,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[API] Housing insert error:", {
          clientId,
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
      clientId,
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
