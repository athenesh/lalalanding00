import { NextResponse } from 'next/server';
import { getClientIdForUser, requireClientOrAuthorized } from '@/lib/auth';
import { createClerkSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/client/checklist/files/download?document_id={document_id}
 * 체크리스트 파일 다운로드 (Signed URL 생성)
 * 권한 부여된 사용자도 다운로드 가능합니다.
 */
export async function GET(request: Request) {
  try {
    console.log('[API] GET /api/client/checklist/files/download 호출');

    await requireClientOrAuthorized();
    const supabase = createClerkSupabaseClient();

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('document_id');

    if (!documentId) {
      return NextResponse.json(
        { error: 'document_id 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 문서 정보 조회
    const { data: document, error: docError } = await supabase
      .from('client_documents')
      .select('id, client_id, file_url, file_name')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 클라이언트 본인 또는 권한 부여된 사용자의 client_id 조회
    const clientId = await getClientIdForUser();

    if (!clientId || clientId !== document.client_id) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // file_url에서 파일 경로 추출
    // 예: https://xxx.supabase.co/storage/v1/object/public/uploads/user_id/checklist/item_id/filename.jpg
    // -> user_id/checklist/item_id/filename.jpg
    const urlParts = document.file_url.split('/uploads/');
    const filePath = urlParts.length > 1 ? urlParts[1] : null;

    if (!filePath) {
      return NextResponse.json(
        { error: '파일 경로를 추출할 수 없습니다.' },
        { status: 400 }
      );
    }

    // Signed URL 생성 (60초 유효)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('uploads')
      .createSignedUrl(filePath, 60);

    if (signedUrlError || !signedUrlData) {
      console.error('[API] Signed URL 생성 실패:', signedUrlError);
      return NextResponse.json(
        { error: '파일 다운로드 URL 생성 실패' },
        { status: 500 }
      );
    }

    // Signed URL로 리다이렉트
    return NextResponse.redirect(signedUrlData.signedUrl);
  } catch (error) {
    console.error('[API] Error in GET /api/client/checklist/files/download:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

