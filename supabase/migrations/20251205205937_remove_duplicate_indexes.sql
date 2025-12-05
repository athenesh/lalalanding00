-- 중복 인덱스 제거 마이그레이션
-- 성능 어드바이저에서 발견된 중복 인덱스들을 제거하여 저장 공간 절약 및 유지보수성 향상

-- ============================================
-- accounts 테이블: clerk_user_id 중복 인덱스 제거
-- ============================================
-- idx_accounts_clerk_id와 idx_accounts_clerk_user_id가 동일한 컬럼에 대한 인덱스
-- 더 명확한 이름인 idx_accounts_clerk_user_id를 유지하고 idx_accounts_clerk_id 제거
DROP INDEX IF EXISTS public.idx_accounts_clerk_id;

-- ============================================
-- clients 테이블: 중복 인덱스 제거
-- ============================================
-- clerk_user_id 중복 인덱스: idx_clients_clerk_id와 idx_clients_clerk_user_id
-- 더 명확한 이름인 idx_clients_clerk_user_id를 유지하고 idx_clients_clerk_id 제거
DROP INDEX IF EXISTS public.idx_clients_clerk_id;

-- owner_agent_id 중복 인덱스: idx_clients_agent와 idx_clients_owner_agent_id
-- 더 명확한 이름인 idx_clients_owner_agent_id를 유지하고 idx_clients_agent 제거
DROP INDEX IF EXISTS public.idx_clients_agent;

-- ============================================
-- client_documents 테이블: 중복 인덱스 제거
-- ============================================
-- client_id 중복 인덱스: idx_client_documents_client_id와 idx_documents_client
-- 더 명확한 이름인 idx_client_documents_client_id를 유지하고 idx_documents_client 제거
DROP INDEX IF EXISTS public.idx_documents_client;

-- document_type 중복 인덱스: idx_client_documents_document_type와 idx_documents_type
-- 더 명확한 이름인 idx_client_documents_document_type를 유지하고 idx_documents_type 제거
DROP INDEX IF EXISTS public.idx_documents_type;

-- ============================================
-- housing_requirements 테이블: client_id 중복 인덱스 제거
-- ============================================
-- client_id 중복 인덱스: idx_housing_client와 idx_housing_requirements_client_id
-- 더 명확한 이름인 idx_housing_requirements_client_id를 유지하고 idx_housing_client 제거
DROP INDEX IF EXISTS public.idx_housing_client;

