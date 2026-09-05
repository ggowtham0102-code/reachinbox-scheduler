export type EmailStatus = "SCHEDULED" | "DEFERRED" | "SENT" | "FAILED";

export interface EmailJob {
  id: string;
  toEmail: string;
  subject: string;
  senderEmail: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  previewUrl: string | null;
  errorMessage: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  slackWebhookUrl: string | null;
  slackTeamName: string | null;
}

export interface ScheduleFormValues {
  subject: string;
  body: string;
  senderEmail: string;
  recipients: string[];
  startTime: string; // ISO
  delayMs: number;
  hourlyLimit: number;
}
