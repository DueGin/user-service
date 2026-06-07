function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/admin_token=([^;]+)/);
  return match ? match[1] : null;
}

function getRefreshToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/admin_refresh_token=([^;]+)/);
  return match ? match[1] : null;
}

let isRefreshing = false;

async function tryRefreshToken(): Promise<string | null> {
  if (isRefreshing) return null;
  isRefreshing = true;
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (data.success) {
      document.cookie = `admin_token=${data.data.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
      document.cookie = `admin_refresh_token=${data.data.refreshToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
      return data.data.accessToken;
    }
    return null;
  } catch {
    return null;
  } finally {
    isRefreshing = false;
  }
}

export async function adminFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Try to refresh token
    const newToken = await tryRefreshToken();
    if (newToken) {
      const retryRes = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
          ...options.headers,
        },
      });
      return retryRes.json();
    }

    if (typeof window !== "undefined") {
      document.cookie = "admin_token=; path=/; max-age=0";
      document.cookie = "admin_refresh_token=; path=/; max-age=0";
      window.location.href = "/admin/login";
    }
    throw new Error("未登录");
  }

  return res.json();
}
