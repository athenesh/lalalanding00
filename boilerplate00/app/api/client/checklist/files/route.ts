import { NextResponse } from 'next/server';
import { getAuthUserId, requireClient } from '@/lib/auth';
import { createClerkSupabaseClient } from '@/lib/supabase/server';
import {
  uploadChecklistFile,
  deleteChecklistFile,
  getChecklistFiles,
} from '@/lib/storage/checklist-files';
import { dbDocumentToFile } from '@/lib/checklist/transformers';
import type { ChecklistFile } from '@/types/checklist';

/**
 * GET /api/client/checklist/files?item_id={item_id}
 * 체크리스트 항목의 파일 목록 조회
 */
export async function GET(request: Request) {
  try {
    console.log('[API] GET /api/client/checklist/files 호출');

    await requireClient();
    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');

    if (!itemId) {
      return NextResponse.json(
        { error: 'item_id 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 클라이언트 소유권 확인
    const { data: checklistItem, error: itemError } = await supabase
      .from('checklist_items')
      .select('id, client_id')
      .eq('id', itemId)
      .single();

    if (itemError || !checklistItem) {
      return NextResponse.json(
        { error: '체크리스트 항목을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 클라이언트 소유권 확인
    const { data: client } = await supabase
      .from('clients')
      .select('id, clerk_user_id')
      .eq('id', checklistItem.client_id)
      .eq('clerk_user_id', userId)
      .single();

    if (!client) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 파일 목록 조회
    const documents = await getChecklistFiles(itemId);
    const files: ChecklistFile[] = documents.map(dbDocumentToFile);

    console.log('[API] 파일 목록 조회 성공:', {
      itemId,
      fileCount: files.length,
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error('[API] Error in GET /api/client/checklist/files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/client/checklist/files
 * 체크리스트 항목에 파일 업로드
 */
export async function POST(request: Request) {
  try {
    console.log('[API] POST /api/client/checklist/files 호출');

    await requireClient();
    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const itemId = formData.get('item_id') as string;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!itemId) {
      return NextResponse.json(
        { error: 'item_id가 필요합니다.' },
        { status: 400 }
      );
    }

    // 클라이언트 소유권 확인
    const { data: checklistItem, error: itemError } = await supabase
      .from('checklist_items')
      .select('id, client_id')
      .eq('id', itemId)
      .single();

    if (itemError || !checklistItem) {
      return NextResponse.json(
        { error: '체크리스트 항목을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id, clerk_user_id')
      .eq('id', checklistItem.client_id)
      .eq('clerk_user_id', userId)
      .single();

    if (!client) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 파일 업로드
    const result = await uploadChecklistFile(file, itemId, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '파일 업로드 실패' },
        { status: 400 }
      );
    }

    console.log('[API] 파일 업로드 성공:', {
      itemId,
      documentId: result.documentId,
    });

    return NextResponse.json({
      success: true,
      fileUrl: result.fileUrl,
      documentId: result.documentId,
    });
  } catch (error) {
    console.error('[API] Error in POST /api/client/checklist/files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/client/checklist/files?document_id={document_id}&file_path={file_path}
 * 체크리스트 항목의 파일 삭제
 */
export async function DELETE(request: Request) {
  try {
    console.log('[API] DELETE /api/client/checklist/files 호출');

    await requireClient();
    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('document_id');
    const filePath = searchParams.get('file_path');

    if (!documentId || !filePath) {
      return NextResponse.json(
        { error: 'document_id와 file_path 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 문서 소유권 확인
    const { data: document, error: docError } = await supabase
      .from('client_documents')
      .select('id, client_id')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id, clerk_user_id')
      .eq('id', document.client_id)
      .eq('clerk_user_id', userId)
      .single();

    if (!client) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 파일 삭제
    const result = await deleteChecklistFile(documentId, filePath);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '파일 삭제 실패' },
        { status: 400 }
      );
    }

    console.log('[API] 파일 삭제 성공:', { documentId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error in DELETE /api/client/checklist/files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
