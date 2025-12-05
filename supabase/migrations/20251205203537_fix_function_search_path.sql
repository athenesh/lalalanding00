-- PostgreSQL 함수 보안 강화: search_path 설정
-- 모든 함수에 SET search_path = public을 추가하여 보안 취약점 해결

-- ============================================
-- 1. get_checklist_progress 함수 수정
-- ============================================
CREATE OR REPLACE FUNCTION public.get_checklist_progress(p_client_id uuid)
RETURNS TABLE(total_items bigint, completed_items bigint, completion_percentage numeric)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_items,
    COUNT(*) FILTER (WHERE is_completed = true)::BIGINT as completed_items,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND(
        (COUNT(*) FILTER (WHERE is_completed = true)::NUMERIC / COUNT(*)::NUMERIC) * 100,
        2
      )
    END as completion_percentage
  FROM public.checklist_items
  WHERE client_id = p_client_id;
END;
$$;

-- ============================================
-- 2. ui_to_db_category 함수 수정
-- ============================================
CREATE OR REPLACE FUNCTION public.ui_to_db_category(ui_category text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN CASE ui_category
    WHEN 'pre-departure' THEN 'pre_departure'
    WHEN 'arrival' THEN 'arrival'
    WHEN 'settlement' THEN 'settlement'
    ELSE ui_category
  END;
END;
$$;

-- ============================================
-- 3. db_to_ui_category 함수 수정
-- ============================================
CREATE OR REPLACE FUNCTION public.db_to_ui_category(db_category text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN CASE db_category
    WHEN 'pre_departure' THEN 'pre-departure'
    WHEN 'arrival' THEN 'arrival'
    WHEN 'settlement' THEN 'settlement'
    ELSE db_category
  END;
END;
$$;

-- ============================================
-- 4. update_checklist_completed_at 트리거 함수 수정
-- ============================================
CREATE OR REPLACE FUNCTION public.update_checklist_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- 완료로 변경 시 completed_at 설정
  IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
    NEW.completed_at = NOW();
  END IF;
  
  -- 미완료로 변경 시 completed_at 제거
  IF NEW.is_completed = false AND OLD.is_completed = true THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- 5. debug_jwt_claims 함수 수정 (보안 강화)
-- ============================================
CREATE OR REPLACE FUNCTION public.debug_jwt_claims()
RETURNS TABLE (
  sub text,
  role text,
  all_claims jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    auth.jwt()->>'sub' as sub,
    auth.jwt()->>'role' as role,
    auth.jwt() as all_claims;
END;
$$;

