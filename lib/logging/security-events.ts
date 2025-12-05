/**
 * 보안 이벤트 로깅 유틸리티
 * 인증 실패, 권한 위반, 비정상적인 API 호출 등을 로깅
 */

export enum SecurityEventType {
  AUTH_FAILURE = "auth_failure",
  PERMISSION_DENIED = "permission_denied",
  INVALID_INPUT = "invalid_input",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
}

export interface SecurityEvent {
  type: SecurityEventType;
  message: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * 보안 이벤트 로깅
 * 프로덕션에서는 Sentry 등 외부 서비스로 전송
 */
export function logSecurityEvent(event: Omit<SecurityEvent, "timestamp">) {
  const securityEvent: SecurityEvent = {
    ...event,
    timestamp: new Date(),
  };

  // 개발 환경: 콘솔 로그
  if (process.env.NODE_ENV === "development") {
    console.warn("[SECURITY EVENT]", securityEvent);
    return;
  }

  // 프로덕션 환경: 외부 로깅 서비스로 전송 (Sentry 등)
  // TODO: Sentry 연동 시 활성화
  // Sentry.captureMessage(event.message, {
  //   level: "warning",
  //   tags: {
  //     security_event_type: event.type,
  //   },
  //   extra: event.details,
  // });

  // 임시: 프로덕션에서도 콘솔 로그 (나중에 외부 서비스로 교체)
  console.warn("[SECURITY EVENT]", {
    type: securityEvent.type,
    message: securityEvent.message,
    path: securityEvent.path,
    timestamp: securityEvent.timestamp.toISOString(),
    // 민감한 정보는 로그에서 제외
  });
}

/**
 * 인증 실패 로깅
 */
export function logAuthFailure(
  reason: string,
  userId?: string,
  path?: string
) {
  logSecurityEvent({
    type: SecurityEventType.AUTH_FAILURE,
    message: `Authentication failed: ${reason}`,
    userId,
    path,
  });
}

/**
 * 권한 위반 로깅
 */
export function logPermissionDenied(
  userId: string,
  path: string,
  requiredRole?: string
) {
  logSecurityEvent({
    type: SecurityEventType.PERMISSION_DENIED,
    message: `Permission denied: User ${userId} attempted to access ${path}`,
    userId,
    path,
    details: {
      requiredRole,
    },
  });
}

/**
 * 잘못된 입력 로깅
 */
export function logInvalidInput(
  path: string,
  errors: unknown,
  userId?: string
) {
  logSecurityEvent({
    type: SecurityEventType.INVALID_INPUT,
    message: `Invalid input received at ${path}`,
    userId,
    path,
    details: {
      validationErrors: errors,
    },
  });
}

/**
 * 의심스러운 활동 로깅
 */
export function logSuspiciousActivity(
  message: string,
  userId?: string,
  path?: string,
  details?: Record<string, unknown>
) {
  logSecurityEvent({
    type: SecurityEventType.SUSPICIOUS_ACTIVITY,
    message,
    userId,
    path,
    details,
  });
}

