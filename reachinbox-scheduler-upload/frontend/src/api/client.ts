import type { EmailJob, ScheduleFormValues, User } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ? JSON.stringify(body.error) : `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  loginUrl: () => `${API_URL}/api/auth/google`,
  slackConnectUrl: () => `${API_URL}/api/slack/oauth/start`,

  me: () => request<{ user: User }>("/api/auth/me"),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  slackStatus: () =>
    request<{ connected: boolean; teamName: string | null }>("/api/slack/status"),
  slackDisconnect: () =>
    request<{ ok: true }>("/api/slack/disconnect", { method: "POST" }),

  scheduleEmails: (values: ScheduleFormValues) =>
    request<{ batchId: string; scheduledCount: number }>("/api/emails/schedule", {
      method: "POST",
      body: JSON.stringify(values),
    }),

  scheduled: () => request<{ jobs: EmailJob[] }>("/api/emails/scheduled"),
  sent: () => request<{ jobs: EmailJob[] }>("/api/emails/sent"),
};
