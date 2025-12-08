"use server";

/**
 * @file listing-excluded.ts
 * @description 리스팅 제외 상태 업데이트를 위한 Server Action
 *
 * 이 모듈은 shared_listings 테이블의 is_excluded 필드를 업데이트합니다.
 * 채팅방 참여자 모두 제외 상태를 변경할 수 있습니다.
 *
 * 주요 기능:
 * 1. 리스팅 제외 상태 업데이트
 * 2. 권한 확인 (채팅방 참여자 확인)
 * 3. 에러 처리 및 로깅
 *
 * @dependencies
 * - lib/supabase/server: Supabase 클라이언트
 * - lib/auth: 인증 유틸리티
 */

import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/auth";

/**
 * 리스팅 제외 상태를 업데이트합니다.
 *
 * @param listingId - 업데이트할 리스팅의 ID
 * @param isExcluded - 제외 상태 (true: 제외됨, false: 정상)
 * @returns 성공 여부 및 에러 메시지
 */
export async function updateListingExcluded(
  listingId: string,
  isExcluded: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[Server Action] 리스팅 제외 상태 업데이트 시작:", {
      listingId,
      isExcluded,
    });

    const userId = await getAuthUserId();
    if (!userId) {
      console.error("[Server Action] 인증되지 않은 사용자");
      return { success: false, error: "Unauthorized" };
    }

    const supabase = createClerkSupabaseClient();

    // 리스팅이 속한 채팅방 확인
    const { data: listing, error: listingError } = await supabase
      .from("shared_listings")
      .select("room_id")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      console.error("[Server Action] 리스팅을 찾을 수 없음:", {
        listingId,
        error: listingError,
      });
      return { success: false, error: "Listing not found" };
    }

    // 채팅방의 클라이언트 확인
    const { data: room, error: roomError } = await supabase
      .from("chat_rooms")
      .select("client_id")
      .eq("id", listing.room_id)
      .single();

    if (roomError || !room) {
      console.error("[Server Action] 채팅방을 찾을 수 없음:", {
        roomId: listing.room_id,
        error: roomError,
      });
      return { success: false, error: "Chat room not found" };
    }

    // 클라이언트 정보 확인
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("clerk_user_id, owner_agent_id")
      .eq("id", room.client_id)
      .single();

    if (clientError || !client) {
      console.error("[Server Action] 클라이언트를 찾을 수 없음:", {
        clientId: room.client_id,
        error: clientError,
      });
      return { success: false, error: "Client not found" };
    }

    // 권한 확인: 클라이언트 또는 에이전트인지 확인
    const isClient = client.clerk_user_id === userId;

    // 에이전트인지 확인
    let isAgent = false;
    if (client.owner_agent_id) {
      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("clerk_user_id")
        .eq("id", client.owner_agent_id)
        .single();

      if (!accountError && account) {
        isAgent = account.clerk_user_id === userId;
      }
    }

    // 권한 부여된 사용자인지 확인
    let isAuthorized = false;
    const { data: authorization, error: authError } = await supabase
      .from("client_authorizations")
      .select("id")
      .eq("client_id", room.client_id)
      .eq("authorized_clerk_user_id", userId)
      .maybeSingle();

    if (!authError && authorization) {
      isAuthorized = true;
    }

    if (!isClient && !isAgent && !isAuthorized) {
      console.error("[Server Action] 채팅방 참여자가 아님:", {
        listingId,
        userId,
        clientId: client.clerk_user_id,
        ownerAgentId: client.owner_agent_id,
        isClient,
        isAgent,
        isAuthorized,
      });
      return { success: false, error: "Access denied" };
    }

    // 제외 상태 업데이트
    const { error: updateError } = await supabase
      .from("shared_listings")
      .update({ is_excluded: isExcluded })
      .eq("id", listingId);

    if (updateError) {
      console.error("[Server Action] 제외 상태 업데이트 실패:", {
        listingId,
        error: updateError,
      });
      return { success: false, error: "Failed to update excluded status" };
    }

    console.log("[Server Action] 제외 상태 업데이트 성공:", {
      listingId,
      isExcluded,
    });

    return { success: true };
  } catch (error) {
    console.error("[Server Action] 예상치 못한 에러:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
