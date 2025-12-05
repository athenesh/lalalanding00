/**
 * @file checklist-files.ts
 * @description 체크리스트 파일 업로드/삭제 유틸리티
 *
 * Supabase Storage를 사용하여 체크리스트 항목에 첨부된 파일을 관리합니다.
 * 파일 경로: {clerk_user_id}/checklist/{item_id}/{filename}
 */

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import type { Tables, TablesInsert } from '@/database.types';
import { MAX_FILE_SIZE, isValidFileType, isValidFileSize } from '@/constants/checklist';
import { sanitizeFileName, generateSafeFileName } from '@/lib/utils/file-sanitization';

/**
 * 파일 업로드 결과
 */
export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  documentId?: string;
  error?: string;
}

/**
 * 체크리스트 항목에 파일 업로드
 * 
 * @param file 업로드할 파일
 * @param checklistItemId 체크리스트 항목 ID
 * @param clerkUserId Clerk 사용자 ID (경로 생성용)
 * @returns 업로드 결과
 */
export async function uploadChecklistFile(
  file: File,
  checklistItemId: string,
  clerkUserId: string
): Promise<UploadResult> {
  try {
    console.log('[checklist-files] 파일 업로드 시작:', {
      fileName: file.name,
      fileSize: file.size,
      itemId: checklistItemId,
      clerkUserId,
    });

    // 파일 검증
    if (!isValidFileType(file)) {
      return {
        success: false,
        error: '지원되지 않는 파일 형식입니다. (JPG, PNG, PDF, DOC, DOCX, TXT만 허용)',
      };
    }

    if (!isValidFileSize(file)) {
      return {
        success: false,
        error: `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다.`,
      };
    }

    const supabase = createClerkSupabaseClient();

    // 파일명 sanitization 및 안전한 파일명 생성
    const sanitizedOriginalName = sanitizeFileName(file.name);
    const safeFileName = generateSafeFileName(file.name);
    
    // UUID 형식 검증 (checklistItemId와 clerkUserId)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(checklistItemId)) {
      return {
        success: false,
        error: 'Invalid checklist item ID format',
      };
    }
    if (!uuidRegex.test(clerkUserId) && !clerkUserId.match(/^user_[a-zA-Z0-9]+$/)) {
      // Clerk user ID는 user_로 시작할 수 있음
      return {
        success: false,
        error: 'Invalid user ID format',
      };
    }
    
    // 파일 경로 생성: {clerk_user_id}/checklist/{item_id}/{filename}
    const filePath = `${clerkUserId}/checklist/${checklistItemId}/${safeFileName}`;

    console.log('[checklist-files] Storage 경로:', filePath);

    // Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[checklist-files] Storage 업로드 실패:', uploadError);
      return {
        success: false,
        error: `파일 업로드 실패: ${uploadError.message}`,
      };
    }

    // 공개 URL 생성
    const {
      data: { publicUrl },
    } = supabase.storage.from('uploads').getPublicUrl(filePath);

    // client_documents 테이블에 메타데이터 저장
    // client_id는 checklist_item에서 조회해야 함
    const { data: checklistItem } = await supabase
      .from('checklist_items')
      .select('client_id')
      .eq('id', checklistItemId)
      .single();

    if (!checklistItem) {
      // 업로드된 파일 삭제
      await supabase.storage.from('uploads').remove([filePath]);
      return {
        success: false,
        error: '체크리스트 항목을 찾을 수 없습니다.',
      };
    }

    const documentData: TablesInsert<'client_documents'> = {
      client_id: checklistItem.client_id,
      document_type: 'checklist_attachment',
      file_name: sanitizedOriginalName, // 원본 파일명 (sanitized)
      file_url: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: clerkUserId,
    };

    const { data: document, error: documentError } = await supabase
      .from('client_documents')
      .insert(documentData)
      .select()
      .single();

    if (documentError) {
      console.error('[checklist-files] 문서 메타데이터 저장 실패:', documentError);
      // 업로드된 파일 삭제
      await supabase.storage.from('uploads').remove([filePath]);
      return {
        success: false,
        error: `문서 정보 저장 실패: ${documentError.message}`,
      };
    }

    console.log('[checklist-files] 파일 업로드 성공:', {
      documentId: document.id,
      fileUrl: publicUrl,
    });

    return {
      success: true,
      fileUrl: publicUrl,
      documentId: document.id,
    };
  } catch (error) {
    console.error('[checklist-files] 파일 업로드 예외:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

/**
 * 체크리스트 항목의 파일 삭제
 * 
 * @param documentId client_documents 테이블의 ID
 * @param filePath Storage의 파일 경로
 * @returns 삭제 성공 여부
 */
export async function deleteChecklistFile(
  documentId: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[checklist-files] 파일 삭제 시작:', { documentId, filePath });

    const supabase = createClerkSupabaseClient();

    // Storage에서 파일 삭제
    const { error: storageError } = await supabase.storage
      .from('uploads')
      .remove([filePath]);

    if (storageError) {
      console.error('[checklist-files] Storage 삭제 실패:', storageError);
      // Storage 삭제 실패해도 DB 레코드는 삭제 시도
    }

    // client_documents 테이블에서 레코드 삭제
    const { error: documentError } = await supabase
      .from('client_documents')
      .delete()
      .eq('id', documentId);

    if (documentError) {
      console.error('[checklist-files] 문서 메타데이터 삭제 실패:', documentError);
      return {
        success: false,
        error: `문서 정보 삭제 실패: ${documentError.message}`,
      };
    }

    console.log('[checklist-files] 파일 삭제 성공:', { documentId });

    return { success: true };
  } catch (error) {
    console.error('[checklist-files] 파일 삭제 예외:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

/**
 * 체크리스트 항목의 모든 파일 조회
 * 
 * @param checklistItemId 체크리스트 항목 ID
 * @returns 파일 목록
 */
export async function getChecklistFiles(
  checklistItemId: string
): Promise<Tables<'client_documents'>[]> {
  try {
    const supabase = createClerkSupabaseClient();

    // checklist_item에서 client_id 조회
    const { data: checklistItem } = await supabase
      .from('checklist_items')
      .select('client_id')
      .eq('id', checklistItemId)
      .single();

    if (!checklistItem) {
      return [];
    }

    // client_documents에서 checklist_attachment 타입의 문서 조회
    // file_url에 checklistItemId가 포함된 문서만 필터링
    const { data: documents, error } = await supabase
      .from('client_documents')
      .select('*')
      .eq('client_id', checklistItem.client_id)
      .eq('document_type', 'checklist_attachment')
      .like('file_url', `%checklist/${checklistItemId}%`);

    if (error) {
      console.error('[checklist-files] 파일 목록 조회 실패:', error);
      return [];
    }

    return documents || [];
  } catch (error) {
    console.error('[checklist-files] 파일 목록 조회 예외:', error);
    return [];
  }
}
