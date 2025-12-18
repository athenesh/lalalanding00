-- Platform Settings 테이블 생성
-- 시스템 설정을 저장하는 테이블 (Platform Fee, Maintenance Mode 등)

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_by TEXT -- admin clerk_id
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON public.platform_settings(key);

-- 기본 설정 값 삽입
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('platform_fee_percentage', '5.0', '플랫폼 수수료 비율 (%)'),
  ('maintenance_mode', 'false', '점검 모드 활성화 여부'),
  ('max_clients_per_agent', '50', '에이전트당 최대 클라이언트 수')
ON CONFLICT (key) DO NOTHING;

-- RLS 비활성화 (개발 단계)
ALTER TABLE public.platform_settings DISABLE ROW LEVEL SECURITY;

-- 권한 부여
GRANT ALL ON TABLE public.platform_settings TO anon;
GRANT ALL ON TABLE public.platform_settings TO authenticated;
GRANT ALL ON TABLE public.platform_settings TO service_role;

COMMENT ON TABLE public.platform_settings IS '플랫폼 시스템 설정을 저장하는 테이블';
COMMENT ON COLUMN public.platform_settings.key IS '설정 키 (예: platform_fee_percentage)';
COMMENT ON COLUMN public.platform_settings.value IS '설정 값 (텍스트 형식)';
COMMENT ON COLUMN public.platform_settings.updated_by IS '마지막으로 수정한 관리자의 Clerk ID';

