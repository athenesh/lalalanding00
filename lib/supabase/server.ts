import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

/**
 * Clerk + Supabase 네이티브 통합 클라이언트 (Server Component용)
 */
export function createClerkSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseKey, {
    async accessToken() {
      try {
        const authObj = await auth();
        const token = await authObj.getToken();

        // 디버깅: 토큰 확인
        if (!token) {
          console.warn(
            "[Supabase] Clerk token is null - RLS policies may not work",
          );
        } else {
          console.log("[Supabase] Clerk token received, length:", token.length);
        }

        return token ?? null;
      } catch (error) {
        console.error("[Supabase] Error getting Clerk token:", error);
        return null;
      }
    },
  });
}
