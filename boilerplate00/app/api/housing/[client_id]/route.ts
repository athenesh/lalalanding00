import { NextResponse } from "next/server";
import { requireAgent, getOrCreateAccount } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/housing/[client_id]
 * 클라이언트의 주거 요구사항을 조회합니다.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ client_id: string }> }
) {
  try {
    const { client_id } = await params;
    // API 호출 시작 로그
    console.log("[API] GET /api/housing/[client_id] 호출:", {
      clientId: client_id,
    });

    // 에이전트 권한 확인
    await requireAgent();

    const supabase = createClerkSupabaseClient();

    // Account 조회 또는 자동 생성
    const account = await getOrCreateAccount();

    // 클라이언트 소유권 확인
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", client_id)
      .eq("owner_agent_id", account.id)
      .single();

    if (clientError || !client) {
      console.error("[API] Client ownership check failed:", {
        clientId: client_id,
        accountId: account.id,
        error: clientError,
      });
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 404 }
      );
    }

    // 주거 요구사항 조회
    const { data: housing, error: housingError } = await supabase
      .from("housing_requirements")
      .select("*")
      .eq("client_id", client_id)
      .single();

    if (housingError) {
      if (housingError.code === "PGRST116") {
        // 주거 요구사항이 없음 (새로 생성해야 함)
        console.log("[API] Housing requirements not found, returning empty:", {
          clientId: client_id,
        });
        return NextResponse.json({
          housing: null,
        });
      }
      console.error("[API] Housing fetch error:", {
        clientId: client_id,
        error: housingError,
      });
      return NextResponse.json(
        { error: "Failed to fetch housing requirements" },
        { status: 500 }
      );
    }

    console.log("[API] Housing requirements 조회 성공:", {
      clientId: client_id,
      housingId: housing?.id,
      housingType: housing?.housing_type,
    });

    // housing_type이 배열이 아닌 경우 배열로 변환 (기존 데이터 호환성)
    if (housing && housing.housing_type && !Array.isArray(housing.housing_type)) {
      housing.housing_type = [housing.housing_type];
    }

    return NextResponse.json({ housing });
  } catch (error) {
    const { client_id } = await params;
    console.error("[API] Error in GET /api/housing/[client_id]:", {
      clientId: client_id,
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/housing/[client_id]
 * 클라이언트의 주거 요구사항을 업데이트합니다. (없으면 생성)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ client_id: string }> }
) {
  try {
    const { client_id } = await params;
    // API 호출 시작 로그
    console.log("[API] PATCH /api/housing/[client_id] 호출:", {
      clientId: client_id,
    });

    // 에이전트 권한 확인
    await requireAgent();

    const supabase = createClerkSupabaseClient();

    // Account 조회 또는 자동 생성
    const account = await getOrCreateAccount();

    // 클라이언트 소유권 확인
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", client_id)
      .eq("owner_agent_id", account.id)
      .single();

    if (clientError || !client) {
      console.error("[API] Client ownership check failed:", {
        clientId: client_id,
        accountId: account.id,
        error: clientError,
      });
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 404 }
      );
    }

    const body = await request.json();
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
    } = body;

    console.log("[API] 주거 요구사항 업데이트 데이터:", {
      clientId: client_id,
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
    // housingType이 배열인지 확인하고, 배열이 아니면 빈 배열로 처리
    const housingTypeArray = Array.isArray(housingType) 
      ? housingType 
      : housingType 
        ? [housingType] 
        : null;

    console.log("[API] housingType 변환:", {
      original: housingType,
      converted: housingTypeArray,
    });

    // parkingCount 파싱: "4+" 같은 문자열을 처리
    let parkingCountInt: number | null = null;
    if (parkingCount) {
      if (parkingCount.endsWith("+")) {
        // "4+" 같은 경우 4로 저장
        parkingCountInt = parseInt(parkingCount.replace("+", ""));
      } else {
        parkingCountInt = parseInt(parkingCount);
      }
      // 유효하지 않은 숫자인 경우 null로 설정
      if (isNaN(parkingCountInt)) {
        parkingCountInt = null;
      }
    }

    const updateData: any = {
      preferred_city: preferredArea || null,
      budget_max: maxBudget ? parseInt(maxBudget) : null,
      housing_type: housingTypeArray,
      bedrooms: bedrooms ? parseInt(bedrooms) : null,
      bathrooms: bathrooms ? parseFloat(bathrooms) : null,
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
      .eq("client_id", client_id)
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
          clientId: client_id,
          error: updateError,
        });
        return NextResponse.json(
          { error: "Failed to update housing requirements" },
          { status: 500 }
        );
      }

      housing = updatedHousing;
    } else {
      // 생성
      const { data: newHousing, error: insertError } = await supabase
        .from("housing_requirements")
        .insert({
          client_id: client_id,
          ...updateData,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[API] Housing insert error:", {
          clientId: client_id,
          error: insertError,
        });
        return NextResponse.json(
          { error: "Failed to create housing requirements" },
          { status: 500 }
        );
      }

      housing = newHousing;
    }

    console.log("[API] Housing requirements 업데이트 성공:", {
      clientId: client_id,
      housingId: housing.id,
    });

    return NextResponse.json({ housing });
  } catch (error) {
    const { client_id } = await params;
    console.error("[API] Error in PATCH /api/housing/[client_id]:", {
      clientId: client_id,
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

