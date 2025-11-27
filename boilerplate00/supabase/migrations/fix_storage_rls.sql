-- Storage RLS 정책 수정
-- 개발 환경에서 anon 역할도 허용하도록 정책 추가
-- 프로덕션에서는 이 정책을 제거하고 authenticated만 사용하는 것을 권장합니다

-- 기존 정책 삭제 (선택사항 - 이미 존재하는 경우)
-- DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;

-- 개발 환경용: anon 역할도 허용하는 정책 추가
-- 주의: 프로덕션 환경에서는 이 정책을 제거하고 authenticated만 사용하세요

-- INSERT: anon 역할도 업로드 가능 (개발 환경용)
CREATE POLICY IF NOT EXISTS "Allow anon uploads for development"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'uploads');

-- SELECT: anon 역할도 조회 가능 (개발 환경용)
CREATE POLICY IF NOT EXISTS "Allow anon view for development"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'uploads');

-- DELETE: anon 역할도 삭제 가능 (개발 환경용)
CREATE POLICY IF NOT EXISTS "Allow anon delete for development"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'uploads');

-- UPDATE: anon 역할도 업데이트 가능 (개발 환경용)
CREATE POLICY IF NOT EXISTS "Allow anon update for development"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'uploads')
WITH CHECK (bucket_id = 'uploads');

