-- 할당 가능한 클라이언트 뷰 생성
-- 배우자로 등록된 클라이언트와 권한을 받은 클라이언트는 자동으로 제외됨
-- 
-- 제외 조건:
-- 1. owner_agent_id가 NULL이 아닌 클라이언트 (이미 할당됨)
-- 2. 다른 클라이언트의 family_members에 '배우자'로 등록된 클라이언트 (이메일 매칭)
-- 3. client_authorizations 테이블에 권한을 받은 클라이언트 (clerk_user_id 매칭)

CREATE OR REPLACE VIEW public.assignable_clients AS
SELECT DISTINCT 
  c.id,
  c.owner_agent_id,
  c.clerk_user_id,
  c.name,
  c.email,
  c.phone_kr,
  c.phone_us,
  c.occupation,
  c.moving_date,
  c.relocation_type,
  c.moving_type,
  c.birth_date,
  c.created_at,
  c.updated_at,
  c.invitation_token,
  c.access_level,
  c.payment_status,
  c.payment_completed_at
FROM public.clients c
WHERE c.owner_agent_id IS NULL
  -- 배우자로 등록된 클라이언트 제외 (이메일 매칭)
  AND NOT EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.relationship = '배우자'
      AND fm.email IS NOT NULL
      AND fm.email = c.email
  )
  -- 권한을 받은 클라이언트 제외 (clerk_user_id 매칭)
  AND NOT EXISTS (
    SELECT 1
    FROM public.client_authorizations ca
    WHERE ca.authorized_clerk_user_id = c.clerk_user_id
      AND c.clerk_user_id IS NOT NULL
  );

-- 뷰에 대한 설명 추가
COMMENT ON VIEW public.assignable_clients IS 
'할당 가능한 클라이언트 목록. 배우자로 등록된 클라이언트와 권한을 받은 클라이언트는 제외됩니다.';

-- 권한 부여
GRANT SELECT ON public.assignable_clients TO authenticated;
GRANT SELECT ON public.assignable_clients TO service_role;

