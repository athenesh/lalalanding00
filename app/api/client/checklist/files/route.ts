import { NextResponse } from "next/server";
import {
  getAuthUserId,
  getClientIdForUser,
  requireClientOrAuthorized,
} from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import {
  uploadChecklistFile,
  deleteChecklistFile,
  getChecklistFiles,
} from "@/lib/storage/checklist-files";
import { dbDocumentToFile } from "@/lib/checklist/transformers";
import type { ChecklistFile } from "@/types/checklist";
import { uuidSchema } from "@/lib/validations/api-schemas";

/**
 * GET /api/client/checklist/files?item_id={item_id}
 * 체크리스트 항목의 파일 목록 조회
 * 권한 부여된 사용자도 접근 가능합니다.
 */
export async function GET(request: Request) {
  try {
    await requireClientOrAuthorized();
    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("item_id");

    if (!itemId) {
      return NextResponse.json(
        { error: "item_id 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    // UUID 검증
    const idValidation = uuidSchema.safeParse(itemId);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: "Invalid item ID format" },
        { status: 400 },
      );
    }

    // 클라이언트 소유권 확인
    const { data: checklistItem, error: itemError } = await supabase
      .from("checklist_items")
      .select("id, client_id")
      .eq("id", itemId)
      .single();

    if (itemError || !checklistItem) {
      return NextResponse.json(
        { error: "체크리스트 항목을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 클라이언트 본인 또는 권한 부여된 사용자의 client_id 조회
    const clientId = await getClientIdForUser();

    if (!clientId || clientId !== checklistItem.client_id) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다." },
        { status: 403 },
      );
    }

    // 파일 목록 조회
    const documents = await getChecklistFiles(itemId);
    const files: ChecklistFile[] = documents.map(dbDocumentToFile);

    return NextResponse.json({ files });
  } catch (error) {
    console.error("[API] Error in GET /api/client/checklist/files:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/client/checklist/files
 * 체크리스트 항목에 파일 업로드
 * 권한 부여된 사용자도 업로드 가능합니다.
 */
export async function POST(request: Request) {
  try {
    await requireClientOrAuthorized();
    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    console.log("[checklist-files] POST 요청 시작:", { userId });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const itemId = formData.get("item_id") as string;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다." },
        { status: 400 },
      );
    }

    if (!itemId) {
      return NextResponse.json(
        { error: "item_id가 필요합니다." },
        { status: 400 },
      );
    }

    // UUID 검증
    const idValidation = uuidSchema.safeParse(itemId);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: "Invalid item ID format" },
        { status: 400 },
      );
    }

    // 클라이언트 소유권 확인
    const { data: checklistItem, error: itemError } = await supabase
      .from("checklist_items")
      .select("id, client_id")
      .eq("id", itemId)
      .single();

    if (itemError || !checklistItem) {
      return NextResponse.json(
        { error: "체크리스트 항목을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 클라이언트 본인 또는 권한 부여된 사용자의 client_id 조회
    const clientId = await getClientIdForUser();

    if (!clientId || clientId !== checklistItem.client_id) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다." },
        { status: 403 },
      );
    }

    // 클라이언트의 clerk_user_id 조회 (파일 경로 생성용)
    // 권한 부여된 사용자도 클라이언트의 폴더에 업로드해야 함
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("clerk_user_id")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.error("[checklist-files] 클라이언트 조회 실패:", {
        clientId,
        error: clientError?.message,
      });
      return NextResponse.json(
        { error: "클라이언트 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    console.log("[checklist-files] 업로드 준비:", {
      userId,
      clientId,
      clientClerkUserId: client.clerk_user_id,
      itemId,
      fileName: file.name,
    });

    // 파일 업로드 (클라이언트의 clerk_user_id 사용)
    const result = await uploadChecklistFile(
      file,
      itemId,
      client.clerk_user_id,
    );

    if (!result.success) {
      console.error("[checklist-files] 업로드 실패:", {
        error: result.error,
        userId,
        clientClerkUserId: client.clerk_user_id,
      });
      return NextResponse.json(
        { error: result.error || "파일 업로드 실패" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      fileUrl: result.fileUrl,
      documentId: result.documentId,
    });
  } catch (error) {
    console.error("[API] Error in POST /api/client/checklist/files:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/client/checklist/files?document_id={document_id}&file_path={file_path}
 * 체크리스트 항목의 파일 삭제
 * 권한 부여된 사용자도 삭제 가능합니다.
 */
export async function DELETE(request: Request) {
  try {
    await requireClientOrAuthorized();
    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("document_id");
    const filePath = searchParams.get("file_path");

    if (!documentId || !filePath) {
      return NextResponse.json(
        { error: "document_id와 file_path 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    // UUID 검증
    const idValidation = uuidSchema.safeParse(documentId);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: "Invalid document ID format" },
        { status: 400 },
      );
    }

    // 파일 경로 검증 (경로 탐색 공격 방지)
    if (
      filePath.includes("..") ||
      filePath.includes("//") ||
      filePath.includes("\\\\")
    ) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // 문서 소유권 확인
    const { data: document, error: docError } = await supabase
      .from("client_documents")
      .select("id, client_id")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "문서를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 클라이언트 본인 또는 권한 부여된 사용자의 client_id 조회
    const clientId = await getClientIdForUser();

    if (!clientId || clientId !== document.client_id) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다." },
        { status: 403 },
      );
    }

    // 파일 삭제
    const result = await deleteChecklistFile(documentId, filePath);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "파일 삭제 실패" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error in DELETE /api/client/checklist/files:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
