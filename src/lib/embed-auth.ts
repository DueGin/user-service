export const AUTH_SUCCESS_EVENT = "AUTH_SUCCESS";
export const AUTH_ERROR_EVENT = "AUTH_ERROR";

export interface AuthSuccessMessage {
  type: typeof AUTH_SUCCESS_EVENT;
  token: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email?: string;
  };
}

export interface AuthErrorMessage {
  type: typeof AUTH_ERROR_EVENT;
  error: string;
}

export type AuthMessage = AuthSuccessMessage | AuthErrorMessage;

export function postAuthMessage(
  message: AuthMessage,
  targetOrigin: string
): void {
  if (typeof window !== "undefined" && window.parent !== window) {
    window.parent.postMessage(message, targetOrigin);
  }
  if (typeof window !== "undefined" && window.opener) {
    window.opener.postMessage(message, targetOrigin);
  }
}
