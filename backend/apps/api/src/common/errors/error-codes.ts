/**
 * Canonical application error codes.
 * Every code maps to a safe, user-facing message via ERROR_MESSAGES.
 * New modules must register their codes here rather than inventing
 * ad-hoc strings inline — this keeps the frontend error-mapping table
 * (see docs/error-contract.md) in sync with the backend.
 */
export enum ErrorCode {
  // Auth
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_EMAIL_NOT_VERIFIED = 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_ACCOUNT_SUSPENDED = 'AUTH_ACCOUNT_SUSPENDED',
  AUTH_ACCOUNT_DISABLED = 'AUTH_ACCOUNT_DISABLED',
  AUTH_EMAIL_ALREADY_IN_USE = 'AUTH_EMAIL_ALREADY_IN_USE',
  AUTH_USERNAME_ALREADY_IN_USE = 'AUTH_USERNAME_ALREADY_IN_USE',
  AUTH_RESET_TOKEN_INVALID = 'AUTH_RESET_TOKEN_INVALID',

  // Authorization
  FORBIDDEN_RESOURCE = 'FORBIDDEN_RESOURCE',
  FORBIDDEN_INSUFFICIENT_PERMISSIONS = 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',

  // Generic
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',

  // Projects / deployments (reserved for later phases)
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  PROJECT_QUOTA_EXCEEDED = 'PROJECT_QUOTA_EXCEEDED',
  DEPLOYMENT_ALREADY_RUNNING = 'DEPLOYMENT_ALREADY_RUNNING',
  DEPLOYMENT_PROVIDER_UNAVAILABLE = 'DEPLOYMENT_PROVIDER_UNAVAILABLE',
  PROVIDER_CONFIGURATION_ERROR = 'PROVIDER_CONFIGURATION_ERROR',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  DOMAIN_VERIFICATION_FAILED = 'DOMAIN_VERIFICATION_FAILED',
  RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',
}

export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCode.AUTH_SESSION_EXPIRED]: 401,
  [ErrorCode.AUTH_TOKEN_INVALID]: 401,
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: 403,
  [ErrorCode.AUTH_ACCOUNT_SUSPENDED]: 403,
  [ErrorCode.AUTH_ACCOUNT_DISABLED]: 403,
  [ErrorCode.AUTH_EMAIL_ALREADY_IN_USE]: 409,
  [ErrorCode.AUTH_USERNAME_ALREADY_IN_USE]: 409,
  [ErrorCode.AUTH_RESET_TOKEN_INVALID]: 400,
  [ErrorCode.FORBIDDEN_RESOURCE]: 403,
  [ErrorCode.FORBIDDEN_INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.VALIDATION_FAILED]: 422,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.PROJECT_NOT_FOUND]: 404,
  [ErrorCode.PROJECT_QUOTA_EXCEEDED]: 403,
  [ErrorCode.DEPLOYMENT_ALREADY_RUNNING]: 409,
  [ErrorCode.DEPLOYMENT_PROVIDER_UNAVAILABLE]: 503,
  [ErrorCode.PROVIDER_CONFIGURATION_ERROR]: 500,
  [ErrorCode.INSUFFICIENT_CREDITS]: 402,
  [ErrorCode.PAYMENT_FAILED]: 402,
  [ErrorCode.DOMAIN_VERIFICATION_FAILED]: 422,
  [ErrorCode.RESOURCE_LIMIT_EXCEEDED]: 403,
};

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'The email/username or password is incorrect.',
  [ErrorCode.AUTH_SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
  [ErrorCode.AUTH_TOKEN_INVALID]: 'Your session is no longer valid. Please sign in again.',
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: 'Please verify your email address to continue.',
  [ErrorCode.AUTH_ACCOUNT_SUSPENDED]: 'This account has been suspended.',
  [ErrorCode.AUTH_ACCOUNT_DISABLED]: 'This account has been disabled.',
  [ErrorCode.AUTH_EMAIL_ALREADY_IN_USE]: 'An account with this email already exists.',
  [ErrorCode.AUTH_USERNAME_ALREADY_IN_USE]: 'This username is already taken.',
  [ErrorCode.AUTH_RESET_TOKEN_INVALID]: 'This password reset link is invalid or has expired.',
  [ErrorCode.FORBIDDEN_RESOURCE]: 'You do not have access to this resource.',
  [ErrorCode.FORBIDDEN_INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action.',
  [ErrorCode.VALIDATION_FAILED]: 'Some of the submitted information is invalid.',
  [ErrorCode.NOT_FOUND]: 'The requested resource could not be found.',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again shortly.',
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Something went wrong on our end. Please try again.',
  [ErrorCode.PROJECT_NOT_FOUND]: 'This project could not be found.',
  [ErrorCode.PROJECT_QUOTA_EXCEEDED]: 'You have reached your project limit for your current plan.',
  [ErrorCode.DEPLOYMENT_ALREADY_RUNNING]: 'A deployment is already in progress for this project.',
  [ErrorCode.DEPLOYMENT_PROVIDER_UNAVAILABLE]: 'The hosting provider is temporarily unavailable. Your deployment has been queued for retry.',
  [ErrorCode.PROVIDER_CONFIGURATION_ERROR]: 'This hosting service is temporarily unavailable.',
  [ErrorCode.INSUFFICIENT_CREDITS]: "You don't have enough credits for this operation.",
  [ErrorCode.PAYMENT_FAILED]: 'Your payment could not be processed.',
  [ErrorCode.DOMAIN_VERIFICATION_FAILED]: 'We could not verify this domain yet. Please check your DNS records.',
  [ErrorCode.RESOURCE_LIMIT_EXCEEDED]: 'This action exceeds your current plan limits.',
};
