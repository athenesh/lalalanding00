import { z } from "zod";

/**
 * API 라우트 입력 검증을 위한 Zod 스키마
 * SQL 인젝션 및 XSS 공격 방지를 위한 입력 검증
 */

// UUID 검증
export const uuidSchema = z.string().uuid("Invalid UUID format");

// 메시지 전송 스키마
export const postMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message content is required")
    .max(10000, "Message content is too long")
    .trim(),
  client_id: uuidSchema.optional(),
});

// 메시지 조회 쿼리 스키마
export const getMessagesQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .pipe(z.number().int().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().int().min(0)),
});

// 클라이언트 업데이트 스키마
export const updateClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name is too long").trim(),
  email: z.string().email("Invalid email format").max(255, "Email is too long"),
  phone: z.string().max(50, "Phone is too long").optional().nullable(),
  occupation: z.string().min(1, "Occupation is required").max(100, "Occupation is too long"),
  moving_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  relocation_type: z.enum(["주재원", "학업", "출장"], {
    errorMap: () => ({ message: "Invalid relocation type" }),
  }),
  moving_type: z.string().max(50, "Moving type is too long").optional().nullable(),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional()
    .nullable(),
  family_members: z
    .array(
      z.object({
        name: z.string().min(1, "Family member name is required").max(200),
        relationship: z.string().max(100),
        birth_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
          .optional()
          .nullable(),
        phone: z.string().max(50).optional().nullable(),
        email: z.string().email().max(255).optional().nullable(),
        notes: z.string().max(1000).optional().nullable(),
      })
    )
    .optional()
    .nullable(),
  emergency_contacts: z
    .array(
      z.object({
        name: z.string().min(1, "Emergency contact name is required").max(200),
        relationship: z.string().max(100),
        phone_kr: z.string().max(50).optional().nullable(),
        email: z.string().email().max(255).optional().nullable(),
        kakao_id: z.string().max(100).optional().nullable(),
      })
    )
    .optional()
    .nullable(),
});

// 주거 요구사항 업데이트 스키마
export const updateHousingSchema = z.object({
  preferredArea: z.string().max(200, "Preferred area is too long").optional().nullable(),
  maxBudget: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? parseInt(val, 10) : null))
    .pipe(z.number().int().min(0).max(1000000).nullable()),
  housingType: z
    .union([
      z.string(),
      z.array(z.string()),
    ])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      if (Array.isArray(val)) return val;
      return [val];
    }),
  bedrooms: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? parseInt(val, 10) : null))
    .pipe(z.number().int().min(0).max(20).nullable()),
  bathrooms: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? parseFloat(val) : null))
    .pipe(z.number().min(0).max(20).nullable()),
  furnished: z.boolean().optional().nullable(),
  hasWasherDryer: z.boolean().optional().nullable(),
  parking: z.boolean().optional().nullable(),
  parkingCount: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      if (val.endsWith("+")) {
        return parseInt(val.replace("+", ""), 10);
      }
      return parseInt(val, 10);
    })
    .pipe(z.number().int().min(0).max(20).nullable()),
  hasPets: z.boolean().optional().nullable(),
  petDetails: z.string().max(500, "Pet details is too long").optional().nullable(),
  schoolDistrict: z.boolean().optional().nullable(),
  workplaceAddress: z.string().max(500, "Workplace address is too long").optional().nullable(),
  additionalNotes: z.string().max(2000, "Additional notes is too long").optional().nullable(),
});

// 체크리스트 업데이트 스키마
export const updateChecklistSchema = z.object({
  items: z.array(
    z.object({
      templateId: uuidSchema,
      is_completed: z.boolean(),
      notes: z.string().max(2000, "Notes is too long").optional().nullable(),
      actual_cost: z
        .number()
        .int()
        .min(0)
        .max(10000000)
        .optional()
        .nullable(),
      reference_url: z.string().url("Invalid URL format").max(500).optional().nullable(),
      completed_at: z.string().datetime().optional().nullable(),
    })
  ),
});

// 클라이언트 프로필 업데이트 스키마 (클라이언트용)
export const updateClientProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name is too long").trim(),
  email: z.string().email("Invalid email format").max(255, "Email is too long"),
  phone_kr: z.string().max(50, "Phone is too long").optional().nullable(),
  phone_us: z.string().max(50, "Phone is too long").optional().nullable(),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional()
    .nullable(),
  family_members: z
    .array(
      z.object({
        name: z.string().min(1, "Family member name is required").max(200),
        relationship: z.string().max(100),
        birth_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
          .optional()
          .nullable(),
        phone: z.string().max(50).optional().nullable(),
        email: z.string().email().max(255).optional().nullable(),
        notes: z.string().max(1000).optional().nullable(),
      })
    )
    .optional()
    .nullable(),
  emergency_contacts: z
    .array(
      z.object({
        name: z.string().min(1, "Emergency contact name is required").max(200),
        relationship: z.string().max(100),
        phone_kr: z.string().max(50).optional().nullable(),
        email: z.string().email().max(255).optional().nullable(),
        kakao_id: z.string().max(100).optional().nullable(),
      })
    )
    .optional()
    .nullable(),
});

