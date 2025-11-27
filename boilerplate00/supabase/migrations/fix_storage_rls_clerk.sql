-- Storage RLS 정책 수정 (Clerk Third-Party Auth용)
-- 문제: Clerk 토큰의 sub claim과 파일 경로의 폴더명이 일치하지 않을 수 있음

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;

-- 새로운 정책: Clerk 토큰의 sub claim을 사용하되, 더 유연하게 처리
-- 주의: 이 정책은 authenticated 역할만 허용합니다

-- INSERT: 인증된 사용자만 자신의 폴더에 업로드 가능
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  -- 파일 경로의 첫 번째 폴더명이 JWT의 sub claim과 일치해야 함
  -- storage.foldername(name)은 경로를 배열로 분리합니다
  (storage.foldername(name))[1] = (auth.jwt()->>'sub')
);

-- SELECT: 인증된 사용자만 자신의 파일 조회 가능
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = (auth.jwt()->>'sub')
);

-- DELETE: 인증된 사용자만 자신의 파일 삭제 가능
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = (auth.jwt()->>'sub')
);

-- UPDATE: 인증된 사용자만 자신의 파일 업데이트 가능
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = (auth.jwt()->>'sub')
)
WITH CHECK (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = (auth.jwt()->>'sub')
);

-- 디버깅용: JWT 내용 확인 함수 (선택사항)
-- 이 함수를 사용하여 실제 JWT의 내용을 확인할 수 있습니다
CREATE OR REPLACE FUNCTION debug_jwt_claims()
RETURNS TABLE (
  sub text,
  role text,
  all_claims jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    auth.jwt()->>'sub' as sub,
    auth.jwt()->>'role' as role,
    auth.jwt() as all_claims;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

