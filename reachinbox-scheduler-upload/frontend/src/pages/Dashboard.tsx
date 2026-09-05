import { useCallback, useEffect, useState } from "react";
import { Header } from "../components/Header";
import { Tabs } from "../components/Tabs";
import { Button } from "../components/Button";
import { ComposeModal } from "../components/ComposeModal";
import { ScheduledTable } from "../components/ScheduledTable";
import { SentTable } from "../components/SentTable";
import { api } from "../api/client";
import type { EmailJob, User } from "../types";

interface Props {
  user: User;
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: Props) {
  const [tab, setTab] = useState<"scheduled" | "sent">("scheduled");
  const [scheduled, setScheduled] = useState<EmailJob[]>([]);
  const [sent, setSent] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [slackConnected, setSlackConnected] = useState(Boolean(user.slackWebhookUrl));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, sentRes] = await Promise.all([api.scheduled(), api.sent()]);
      setScheduled(s.jobs);
      setSent(sentRes.jobs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Light polling keeps the tables fresh as delayed jobs fire in the background.
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    api
      .slackStatus()
      .then((res) => setSlackConnected(res.connected))
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Header
        user={user}
        slackConnected={slackConnected}
        onLogout={onLogout}
        onSlackChange={() => setSlackConnected(false)}
      />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-8 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Tabs
              tabs={[
                { id: "scheduled", label: `Scheduled (${scheduled.length})` },
                { id: "sent", label: `Sent (${sent.length})` },
              ]}
              active={tab}
              onChange={(id) => setTab(id as "scheduled" | "sent")}
            />
          </div>
          <Button onClick={() => setComposeOpen(true)}>+ Compose new email</Button>
        </div>

        {tab === "scheduled" ? (
          <ScheduledTable jobs={scheduled} loading={loading} />
        ) : (
          <SentTable jobs={sent} loading={loading} />
        )}
      </main>

      {composeOpen && (
        <ComposeModal
          defaultSenderEmail={user.email}
          onClose={() => setComposeOpen(false)}
          onScheduled={load}
        />
      )}
    </div>
  );
}
