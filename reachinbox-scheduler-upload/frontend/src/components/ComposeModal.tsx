import { useState } from "react";
import { Modal } from "./Modal";
import { Input, Textarea } from "./Input";
import { Button } from "./Button";
import { api } from "../api/client";
import type { ScheduleFormValues } from "../types";

interface Props {
  onClose: () => void;
  onScheduled: () => void;
  defaultSenderEmail: string;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function parseRecipients(text: string): string[] {
  const matches = text.match(EMAIL_RE) ?? [];
  return Array.from(new Set(matches.map((m) => m.trim().toLowerCase())));
}

export function ComposeModal({ onClose, onScheduled, defaultSenderEmail }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [senderEmail, setSenderEmail] = useState(defaultSenderEmail);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(() => {
    const d = new Date(Date.now() + 5 * 60 * 1000); // default: 5 min from now
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16); // yyyy-MM-ddThh:mm for datetime-local
  });
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    setFileName(file.name);
    setRecipients(parseRecipients(text));
  }

  async function handleSubmit() {
    setError(null);
    if (!subject.trim() || !body.trim()) {
      setError("Subject and body are required.");
      return;
    }
    if (recipients.length === 0) {
      setError("Upload a CSV/text file with at least one recipient email.");
      return;
    }

    const values: ScheduleFormValues = {
      subject,
      body,
      senderEmail,
      recipients,
      startTime: new Date(startTime).toISOString(),
      delayMs: delaySeconds * 1000,
      hourlyLimit,
    };

    setSubmitting(true);
    try {
      await api.scheduleEmails(values);
      onScheduled();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule emails.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Compose new email" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {error && (
          <div className="rounded-sm border border-failed/40 bg-failed/10 px-3 py-2 text-sm text-failed">
            {error}
          </div>
        )}

        <Input
          label="Sender email"
          type="email"
          value={senderEmail}
          onChange={(e) => setSenderEmail(e.target.value)}
          placeholder="you@yourdomain.com"
        />

        <Input
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Quick question about your outbound"
        />

        <Textarea
          label="Body"
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your email — HTML is supported."
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-mist-400">
            Recipients (CSV or .txt)
          </span>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-ink-600 bg-ink-900 px-3 py-6 text-center hover:border-signal/60">
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            />
            <span className="text-sm text-mist-50">
              {fileName ?? "Click to upload a file"}
            </span>
            <span className="text-xs text-mist-400">
              {recipients.length > 0
                ? `${recipients.length} email address${recipients.length === 1 ? "" : "es"} detected`
                : "One address per line, or comma-separated"}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Start time"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            label="Delay between emails (sec)"
            type="number"
            min={1}
            value={delaySeconds}
            onChange={(e) => setDelaySeconds(Number(e.target.value))}
          />
          <Input
            label="Hourly limit / sender"
            type="number"
            min={1}
            value={hourlyLimit}
            onChange={(e) => setHourlyLimit(Number(e.target.value))}
          />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Scheduling…" : "Schedule"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
