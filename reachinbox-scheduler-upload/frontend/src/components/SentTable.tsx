import type { EmailJob } from "../types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  jobs: EmailJob[];
  loading: boolean;
}

export function SentTable({ jobs, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-sm bg-ink-800" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-ink-600 py-16 text-center">
        <p className="text-mist-50">No emails sent yet</p>
        <p className="mt-1 text-sm text-mist-400">
          Sent and failed sends will show up here once your queue fires.
        </p>
      </div>
    );
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-ink-600 text-left text-xs uppercase tracking-wide text-mist-400">
          <th className="py-2 pr-4 font-normal">Email</th>
          <th className="py-2 pr-4 font-normal">Subject</th>
          <th className="py-2 pr-4 font-normal">Sent time</th>
          <th className="py-2 pr-4 font-normal">Status</th>
          <th className="py-2 pr-4 font-normal">Preview</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr key={job.id} className="border-b border-ink-700/60">
            <td className="py-3 pr-4 text-mist-50">{job.toEmail}</td>
            <td className="py-3 pr-4 text-mist-200">{job.subject}</td>
            <td className="py-3 pr-4 font-mono text-xs text-mist-400">
              {job.sentAt ? new Date(job.sentAt).toLocaleString() : "—"}
            </td>
            <td className="py-3 pr-4">
              <StatusBadge status={job.status} />
            </td>
            <td className="py-3 pr-4">
              {job.previewUrl ? (
                <a
                  href={job.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-signal hover:underline"
                >
                  View
                </a>
              ) : (
                <span className="text-mist-400">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
