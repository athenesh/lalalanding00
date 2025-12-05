"use client";

import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";

/**
 * Clerk + Supabase 네이티브 통합 클라이언트 (Client Component용)
 *
 * 2025년 4월부터 권장되는 방식:
 * - JWT 템플릿 불필요
 * - useAuth().getToken()으로 현재 세션 토큰 사용
 * - React Hook으로 제공되어 Client Component에서 사용
 *
 * 중요: Supabase Third-Party Auth로 Clerk를 등록한 경우
 * - Clerk 세션 토큰에 `role: 'authenticated'` claim이 포함되어야 합니다
 * - 이 클라이언트는 Database와 Storage 모두에서 사용 가능합니다
 * - RLS 정책에서 `authenticated` 역할로 인식됩니다
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * import { useClerkSupabaseClient } from '@/lib/supabase/clerk-client';
 *
 * export default function MyComponent() {
 *   const supabase = useClerkSupabaseClient();
 *
 *   async function fetchData() {
 *     const { data } = await supabase.from('table').select('*');
 *     return data;
 *   }
 *
 *   async function uploadFile() {
 *     const { data } = await supabase.storage
 *       .from('bucket')
 *       .upload('path/file.jpg', file);
 *     return data;
 *   }
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useClerkSupabaseClient() {
  const { getToken, isLoaded } = useAuth();

  const supabase = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    return createClient(supabaseUrl, supabaseKey, {
      async accessToken() {
        // Clerk 토큰이 로드되지 않았거나 없으면 null 반환
        if (!isLoaded) return null;
        try {
          const token = await getToken();
          // Third-Party Auth가 설정된 경우 Clerk 토큰이 authenticated 역할로 인식됩니다
          return token ?? null;
        } catch (error) {
          console.error("Error getting Clerk token:", error);
          return null;
        }
      },
    });
  }, [getToken, isLoaded]);

  return supabase;
}

/**
 * Storage 전용 Supabase 클라이언트 (Clerk 토큰 없이 사용)
 *
 * Storage API는 Clerk JWT 토큰과 호환되지 않으므로,
 * 별도의 클라이언트를 사용합니다.
 *
 * 주의: 이 클라이언트는 Storage 작업에만 사용하고,
 * Database 쿼리에는 useClerkSupabaseClient()를 사용하세요.
 */
export function useStorageClient() {
  const supabase = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Clerk 토큰 없이 클라이언트 생성
    return createClient(supabaseUrl, supabaseKey);
  }, []);

  return supabase;
}
