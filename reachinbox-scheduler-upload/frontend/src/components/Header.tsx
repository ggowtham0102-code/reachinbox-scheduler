import type { User } from "../types";
import { Button } from "./Button";
import { api } from "../api/client";

interface Props {
  user: User;
  slackConnected: boolean;
  onLogout: () => void;
  onSlackChange: () => void;
}

export function Header({ user, slackConnected, onLogout, onSlackChange }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-ink-600 px-8 py-4">
      <div className="flex items-center gap-2">
        <span className="font-display text-lg font-semibold tracking-tight text-mist-50">
          ReachInbox
        </span>
        <span className="rounded-sm border border-ink-600 px-2 py-0.5 font-mono text-[11px] text-mist-400">
          scheduler
        </span>
      </div>

      <div className="flex items-center gap-4">
        {slackConnected ? (
          <button
            onClick={async () => {
              await api.slackDisconnect();
              onSlackChange();
            }}
            className="flex items-center gap-1.5 text-sm text-sent"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sent" />
            Slack connected
          </button>
        ) : (
          <a
            href={api.slackConnectUrl()}
            className="flex items-center gap-1.5 text-sm text-mist-400 hover:text-mist-50"
          >
            Connect Slack
          </a>
        )}

        <div className="h-6 w-px bg-ink-600" />

        <div className="flex items-center gap-2">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-8 w-8 rounded-full border border-ink-600"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-700 text-xs text-mist-50">
              {user.name.slice(0, 1)}
            </div>
          )}
          <div className="leading-tight">
            <p className="text-sm text-mist-50">{user.name}</p>
            <p className="text-xs text-mist-400">{user.email}</p>
          </div>
        </div>

        <Button variant="ghost" onClick={onLogout}>
          Log out
        </Button>
      </div>
    </header>
  );
}
