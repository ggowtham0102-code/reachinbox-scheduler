import { api } from "../api/client";
import { Button } from "../components/Button";

export function Login() {
  const params = new URLSearchParams(window.location.search);
  const failed = params.get("error") === "google_auth_failed";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-signal">
          ReachInbox
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-mist-50">
          Email job scheduler
        </h1>
        <p className="mt-2 max-w-sm text-sm text-mist-400">
          Schedule, throttle, and track outbound sends — backed by a queue that
          survives restarts.
        </p>
      </div>

      {failed && (
        <p className="rounded-sm border border-failed/40 bg-failed/10 px-3 py-2 text-sm text-failed">
          Google sign-in failed. Please try again.
        </p>
      )}

      <a href={api.loginUrl()}>
        <Button className="px-6 py-3 text-base">Continue with Google</Button>
      </a>
    </div>
  );
}
