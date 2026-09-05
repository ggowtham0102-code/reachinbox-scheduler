import type { EmailStatus } from "../types";

const styles: Record<EmailStatus, string> = {
  SCHEDULED: "bg-signal/15 text-signal border-signal/40",
  DEFERRED: "bg-deferred/15 text-deferred border-deferred/40",
  SENT: "bg-sent/15 text-sent border-sent/40",
  FAILED: "bg-failed/15 text-failed border-failed/40",
};

const labels: Record<EmailStatus, string> = {
  SCHEDULED: "Scheduled",
  DEFERRED: "Deferred",
  SENT: "Sent",
  FAILED: "Failed",
};

export function StatusBadge({ status }: { status: EmailStatus }) {
  return (
    <span
      className={`inline-block rounded-sm border px-2 py-0.5 font-mono text-xs ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
