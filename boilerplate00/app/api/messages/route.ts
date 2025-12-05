import { NextResponse } from "next/server";
import { getAuthUserId, getAuthRole } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { fetchListingFromText } from "@/actions/gemini-listing";
import { extractListingUrls } from "@/lib/listing/url-parser";

/**
 * POST /api/messages
 * 메시지를 전송하고, URL이 포함된 경우 리스팅 정보를 가져와 저장합니다.
 * 
 * 요청 본문:
 * {
 *   "content": "메시지 내용",
 *   "client_id": "클라이언트 UUID" (에이전트인 경우 필수)
 * }
 */
export async function POST(request: Request) {
  try {
    console.log("[API] POST /api/messages 호출");

    const userId = await getAuthUserId();
    const role = await getAuthRole();
    const supabase = createClerkSupabaseClient();

    if (!role) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { content, client_id } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // 클라이언트 ID 결정
    let targetClientId: string;

    if (role === "client") {
      // 클라이언트는 자신의 ID 사용
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("clerk_user_id", userId)
        .single();

      if (clientError || !client) {
        console.error("[API] Client not found:", { userId, error: clientError });
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 }
        );
      }

      targetClientId = client.id;
    } else if (role === "agent") {
      // 에이전트는 client_id 파라미터 필요
      if (!client_id) {
        return NextResponse.json(
          { error: "client_id is required for agents" },
          { status: 400 }
        );
      }

      // 에이전트가 해당 클라이언트의 소유자인지 확인
      const { data: account } = await supabase
        .from("accounts")
        .select("id")
        .eq("clerk_user_id", userId)
        .single();

      if (!account) {
        return NextResponse.json(
          { error: "Agent account not found" },
          { status: 404 }
        );
      }

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

      targetClientId = client.id;
    } else {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 403 }
      );
    }

    // 채팅방 찾기 또는 생성
    let roomId: string;

    const { data: existingRoom, error: roomFindError } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("client_id", targetClientId)
      .eq("room_type", "general") // 1:1 채팅방 (제약 조건: 'listing' 또는 'general'만 허용)
      .maybeSingle(); // .single() 대신 .maybeSingle() 사용 (없을 때 에러 발생 방지)

    if (roomFindError && roomFindError.code !== "PGRST116") {
      // PGRST116은 "no rows returned" 에러 (정상적인 경우)
      console.error("[API] 채팅방 조회 실패:", roomFindError);
      return NextResponse.json(
        { error: "Failed to find chat room" },
        { status: 500 }
      );
    }

    if (existingRoom) {
      roomId = existingRoom.id;
      console.log("[API] 기존 채팅방 사용:", { roomId });
    } else {
      // 새 채팅방 생성
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("name")
        .eq("id", targetClientId)
        .single();

      if (clientError) {
        console.error("[API] 클라이언트 조회 실패:", {
          error: clientError,
          clientId: targetClientId,
        });
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 }
        );
      }

      const { data: newRoom, error: createRoomError } = await supabase
        .from("chat_rooms")
        .insert({
          client_id: targetClientId,
          name: `${client?.name || "Client"} Chat`,
          room_type: "general", // 제약 조건: 'listing' 또는 'general'만 허용
        })
        .select("id")
        .single();

      if (createRoomError || !newRoom) {
        console.error("[API] 채팅방 생성 실패:", {
          error: createRoomError,
          clientId: targetClientId,
          clientName: client?.name,
        });
        return NextResponse.json(
          {
            error: "Failed to create chat room",
            details: createRoomError?.message || "Unknown error",
          },
          { status: 500 }
        );
      }

      roomId = newRoom.id;
      console.log("[API] 새 채팅방 생성:", { roomId, clientId: targetClientId });
    }

    // 메시지 저장
    const { data: message, error: messageError } = await supabase
      .from("chat_messages")
      .insert({
        room_id: roomId,
        sender_clerk_id: userId,
        sender_type: role,
        content: content.trim(),
      })
      .select()
      .single();

    if (messageError || !message) {
      console.error("[API] 메시지 저장 실패:", messageError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    console.log("[API] 메시지 전송 성공:", {
      messageId: message.id,
      roomId,
      content: content.substring(0, 50),
    });

    // 리스팅 정보 추출 시도 (URL 또는 텍스트 설명)
    const listingUrls = extractListingUrls(content);
    let listingId: string | null = null;

    console.log("[API] 리스팅 URL 추출 결과:", {
      urlCount: listingUrls.length,
      urls: listingUrls,
      contentLength: content.trim().length,
    });

    // URL이 있으면 URL 사용, 없으면 전체 텍스트 사용
    const textToExtract = listingUrls.length > 0 ? listingUrls[0] : content.trim();
    const listingUrl = listingUrls.length > 0 ? listingUrls[0] : undefined;

    // 메시지에 리스팅 관련 정보가 있을 가능성이 있는지 확인
    // (URL이 있거나, 텍스트가 충분히 긴 경우)
    const shouldExtractListing =
      listingUrls.length > 0 || content.trim().length > 20;

    console.log("[API] 리스팅 추출 여부 결정:", {
      shouldExtractListing,
      hasUrl: listingUrls.length > 0,
      contentLength: content.trim().length,
    });

    if (shouldExtractListing) {
      try {
        console.log("[API] Gemini API로 리스팅 정보 추출 시작:", {
          textToExtract: textToExtract.substring(0, 100),
          hasUrl: listingUrls.length > 0,
          listingUrl,
        });

        const listingData = await fetchListingFromText(textToExtract, listingUrl);

        if (listingData) {
          console.log("[API] Gemini API 리스팅 정보 추출 성공:", {
            address: listingData.address,
            price: listingData.price,
            bedrooms: listingData.bedrooms,
            bathrooms: listingData.bathrooms,
            square_feet: listingData.square_feet,
            title: listingData.title,
            listing_url: listingData.listing_url,
          });

          // shared_listings에 저장
          // square_feet 컬럼이 없을 수 있으므로 조건부로 포함
          const insertData: Record<string, any> = {
            room_id: roomId,
            shared_by: userId,
            listing_url: listingData.listing_url,
            address: listingData.address,
            price: listingData.price,
            bedrooms: listingData.bedrooms,
            bathrooms: listingData.bathrooms,
            title: listingData.title,
            thumbnail_url: listingData.thumbnail_url,
          };

          // square_feet 컬럼이 있는 경우에만 추가
          // (마이그레이션이 적용되지 않은 경우를 대비)
          if (listingData.square_feet !== null && listingData.square_feet !== undefined) {
            insertData.square_feet = listingData.square_feet;
          }

          // 중복 체크: 같은 채팅방에 같은 listing_url이 이미 존재하는지 확인
          const { data: existingListing, error: checkError } = await supabase
            .from("shared_listings")
            .select("id")
            .eq("room_id", roomId)
            .eq("listing_url", listingData.listing_url)
            .single();

          if (checkError && checkError.code !== "PGRST116") {
            // PGRST116은 "no rows returned" 에러 (정상적인 경우)
            console.error("[API] 리스팅 중복 체크 실패:", checkError);
          }

          if (existingListing) {
            console.log("[API] 이미 존재하는 리스팅 URL, 중복 저장 스킵:", {
              listingUrl: listingData.listing_url,
              roomId,
            });
            // 중복이므로 저장하지 않고 기존 ID 사용
            listingId = existingListing.id;
          } else {
            // 중복이 아니므로 새로 저장
            const { data: listing, error: listingError } = await supabase
              .from("shared_listings")
              .insert(insertData)
              .select("id")
              .single();

            if (!listingError && listing) {
              listingId = listing.id;
              console.log("[API] 리스팅 정보 저장 성공:", {
                listingId,
                roomId,
              });
            } else {
              console.error("[API] 리스팅 정보 저장 실패:", {
                error: listingError,
                listingData,
              });
            }
          }
        } else {
          console.log("[API] Gemini API가 리스팅 정보를 추출하지 못함 (null 반환)");
        }
      } catch (error) {
        console.error("[API] Gemini API 리스팅 정보 추출 실패:", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // 리스팅 정보 가져오기 실패는 메시지 전송을 막지 않음
      }
    } else {
      console.log("[API] 리스팅 추출 스킵 (조건 불만족)");
    }

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        sender_clerk_id: message.sender_clerk_id,
        sender_type: message.sender_type,
        created_at: message.created_at,
      },
      listing_id: listingId,
    });
  } catch (error) {
    console.error("[API] Error in POST /api/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/messages
 * 채팅방의 메시지 목록을 조회합니다.
 * 
 * 쿼리 파라미터:
 * - client_id: 클라이언트 ID (에이전트인 경우 필수)
 * - limit: 페이지당 메시지 수 (기본: 50)
 * - offset: 오프셋 (기본: 0)
 */
export async function GET(request: Request) {
  try {
    console.log("[API] GET /api/messages 호출");

    const userId = await getAuthUserId();
    const role = await getAuthRole();
    const supabase = createClerkSupabaseClient();

    if (!role) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientIdParam = searchParams.get("client_id");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // 클라이언트 ID 결정
    let targetClientId: string;

    if (role === "client") {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("clerk_user_id", userId)
        .single();

      if (clientError || !client) {
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 }
        );
      }

      targetClientId = client.id;
    } else if (role === "agent") {
      if (!clientIdParam) {
        return NextResponse.json(
          { error: "client_id is required for agents" },
          { status: 400 }
        );
      }

      const { data: account } = await supabase
        .from("accounts")
        .select("id")
        .eq("clerk_user_id", userId)
        .single();

      if (!account) {
        return NextResponse.json(
          { error: "Agent account not found" },
          { status: 404 }
        );
      }

      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("id", clientIdParam)
        .eq("owner_agent_id", account.id)
        .single();

      if (clientError || !client) {
        return NextResponse.json(
          { error: "Client not found or access denied" },
          { status: 404 }
        );
      }

      targetClientId = client.id;
    } else {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 403 }
      );
    }

    // 채팅방 찾기
    const { data: room, error: roomError } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("client_id", targetClientId)
      .eq("room_type", "general") // 제약 조건: 'listing' 또는 'general'만 허용
      .single();

    if (roomError || !room) {
      // 채팅방이 없으면 빈 메시지 목록 반환
      return NextResponse.json({
        messages: [],
        listings: [],
        total: 0,
      });
    }

    // 메시지 조회
    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      console.error("[API] 메시지 조회 실패:", {
        error: messagesError,
        roomId: room.id,
      });
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    console.log("[API] 메시지 조회 성공:", {
      messageCount: messages?.length || 0,
      roomId: room.id,
    });

    // 리스팅 정보 조회
    const { data: listings, error: listingsError } = await supabase
      .from("shared_listings")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true });

    if (listingsError) {
      console.error("[API] 리스팅 조회 실패:", {
        error: listingsError,
        roomId: room.id,
      });
    } else {
      console.log("[API] 리스팅 조회 성공:", {
        listingCount: listings?.length || 0,
        roomId: room.id,
      });
    }

    // 전체 메시지 수 조회
    const { count } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("room_id", room.id);

    return NextResponse.json({
      messages: messages || [],
      listings: listings || [],
      total: count || 0,
    });
  } catch (error) {
    console.error("[API] Error in GET /api/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

