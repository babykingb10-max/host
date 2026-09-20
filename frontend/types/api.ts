export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  emailVerified: boolean;
  roles?: string[];
  createdAt?: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: string[];
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface Money {
  amount: number;
  currency: 'credits' | 'USD' | string;
}
