"use server";

/**
 * @file listing-notes.ts
 * @description 리스팅 메모 업데이트를 위한 Server Action
 *
 * 이 모듈은 shared_listings 테이블의 notes 필드를 업데이트합니다.
 * 채팅방 참여자 모두 메모를 수정할 수 있습니다.
 *
 * 주요 기능:
 * 1. 리스팅 메모 업데이트
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
 * 리스팅 메모를 업데이트합니다.
 *
 * @param listingId - 업데이트할 리스팅의 ID
 * @param notes - 새로운 메모 내용 (null이면 메모 삭제)
 * @returns 성공 여부 및 에러 메시지
 */
export async function updateListingNotes(
  listingId: string,
  notes: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[Server Action] 리스팅 메모 업데이트 시작:", {
      listingId,
      notesLength: notes?.length || 0,
    });

    const userId = await getAuthUserId();
    if (!userId) {
      console.error("[Server Action] 인증되지 않은 사용자");
      return { success: false, error: "Unauthorized" };
    }

    const supabase = createClerkSupabaseClient();

    // 리스팅 존재 확인
    const { data: listing, error: fetchError } = await supabase
      .from("shared_listings")
      .select("room_id")
      .eq("id", listingId)
      .single();

    if (fetchError || !listing) {
      console.error("[Server Action] 리스팅 조회 실패:", {
        listingId,
        error: fetchError,
      });
      return { success: false, error: "Listing not found" };
    }

    // 채팅방 참여자 확인
    // room_id -> chat_rooms -> clients 확인
    const { data: room, error: roomError } = await supabase
      .from("chat_rooms")
      .select("client_id")
      .eq("id", listing.room_id)
      .single();

    if (roomError || !room) {
      console.error("[Server Action] 채팅방 조회 실패:", {
        roomId: listing.room_id,
        error: roomError,
      });
      return { success: false, error: "Chat room not found" };
    }

    // 클라이언트 확인
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("clerk_user_id, owner_agent_id")
      .eq("id", room.client_id)
      .single();

    if (clientError || !client) {
      console.error("[Server Action] 클라이언트 조회 실패:", {
        clientId: room.client_id,
        error: clientError,
      });
      return { success: false, error: "Client not found" };
    }

    // 클라이언트인지 확인
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

    if (!isClient && !isAgent) {
      console.error("[Server Action] 채팅방 참여자가 아님:", {
        listingId,
        userId,
        clientId: client.clerk_user_id,
        ownerAgentId: client.owner_agent_id,
      });
      return { success: false, error: "Access denied" };
    }

    // 메모 업데이트
    const { error: updateError } = await supabase
      .from("shared_listings")
      .update({ notes: notes || null })
      .eq("id", listingId);

    if (updateError) {
      console.error("[Server Action] 메모 업데이트 실패:", {
        listingId,
        error: updateError,
      });
      return { success: false, error: "Failed to update notes" };
    }

    console.log("[Server Action] 메모 업데이트 성공:", {
      listingId,
      notesLength: notes?.length || 0,
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
