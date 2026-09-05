import "dotenv/config";

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function requiredInProd(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  port: Number(optional("PORT", "4000")),
  frontendUrl: optional("FRONTEND_URL", "http://localhost:5173"),
  sessionSecret: requiredInProd("SESSION_SECRET", "dev-secret-change-me"),

  databaseUrl: optional("DATABASE_URL"),
  redisUrl: optional("REDIS_URL", "redis://localhost:6379"),

  workerConcurrency: Number(optional("WORKER_CONCURRENCY", "5")),
  minSendDelayMs: Number(optional("MIN_SEND_DELAY_MS", "2000")),
  maxEmailsPerHourPerSender: Number(
    optional("MAX_EMAILS_PER_HOUR_PER_SENDER", "200")
  ),

  smtp: {
    host: optional("SMTP_HOST", "smtp.ethereal.email"),
    port: Number(optional("SMTP_PORT", "587")),
    user: optional("SMTP_USER"),
    pass: optional("SMTP_PASS"),
  },

  google: {
    clientId: optional("GOOGLE_CLIENT_ID"),
    clientSecret: optional("GOOGLE_CLIENT_SECRET"),
    callbackUrl: optional(
      "GOOGLE_CALLBACK_URL",
      "http://localhost:4000/api/auth/google/callback"
    ),
  },

  slack: {
    clientId: optional("SLACK_CLIENT_ID"),
    clientSecret: optional("SLACK_CLIENT_SECRET"),
    redirectUrl: optional(
      "SLACK_REDIRECT_URL",
      "http://localhost:4000/api/slack/oauth/callback"
    ),
  },

  elasticsearchUrl: optional("ELASTICSEARCH_URL"),
};

export const EMAIL_QUEUE_NAME = "email-send";
