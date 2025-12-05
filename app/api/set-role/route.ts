import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const setRoleSchema = z.object({
  role: z.enum(["agent", "client"], {
    errorMap: () => ({ message: "Role must be 'agent' or 'client'" }),
  }),
});

/**
 * 사용자 역할을 설정하는 API
 * 회원가입 후 역할(agent/client)을 설정할 때 사용합니다.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Zod 스키마로 입력 검증
    const validationResult = setRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid request body",
          details: validationResult.error.errors 
        },
        { status: 400 },
      );
    }

    const { role } = validationResult.data;

    // Clerk에서 사용자 정보 가져오기
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // 이미 역할이 설정되어 있는지 확인
    const currentRole = user.publicMetadata?.role;
    if (currentRole) {
      // 이미 역할이 설정되어 있고, 요청한 역할과 동일한 경우 성공으로 처리
      if (currentRole === role) {
        return NextResponse.json({
          success: true,
          role: role,
          message: "Role already set",
        });
      }
      // 다른 역할이 설정되어 있는 경우 에러 반환
      return NextResponse.json(
        {
          error: "Role already set to different role",
          currentRole,
          requestedRole: role,
        },
        { status: 400 },
      );
    }

    // 역할 설정
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: role,
      },
    });

    return NextResponse.json({
      success: true,
      role: role,
    });
  } catch (error) {
    console.error("Error setting role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
