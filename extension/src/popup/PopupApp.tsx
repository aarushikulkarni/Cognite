import { useEffect, useState } from "react";
import { DEFAULT_SITES } from "../shared/constants";
import type { LiveStatus } from "../shared/types";

function formatRemaining(ms: number | null): string {
  if (ms === null) return "Not on a tracked site";
  if (ms <= 0) return "Challenge available";
  const mins = Math.ceil(ms / 60_000);
  if (mins >= 2) return `${mins} min until a prompt`;
  const secs = Math.max(1, Math.ceil(ms / 1000));
  return `${secs}s until a prompt`;
}

export function PopupApp() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void chrome.runtime
      .sendMessage({ type: "GET_STATUS" })
      .then((res: LiveStatus) => setStatus(res))
      .catch(() => setError("Could not read status."));
  }, []);

  if (error) {
    return (
      <div className="wrap" style={{ width: 320, padding: 16 }}>
        <p>{error}</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="wrap" style={{ width: 320, padding: 16 }}>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  const last = status.progress.sessions[0];
  const site = DEFAULT_SITES.find((s) => s.id === status.activeSiteId)?.label;

  return (
    <div style={{ width: 340, padding: 16 }}>
      <p className="kicker">Cognite</p>
      <h1 className="sans" style={{ fontSize: 22, margin: "0 0 4px" }}>
        Reignite your cognition
      </h1>
      {!status.settings.onboardingComplete && (
        <p className="muted">Finish setup to start tracking selected sites.</p>
      )}
      <div className="card" style={{ marginTop: 12 }}>
        <p className="muted sans" style={{ margin: 0, fontSize: 12 }}>
          Cognitive Score
        </p>
        <p className="score">{status.progress.cognitiveScore}</p>
        <div className="row muted sans" style={{ fontSize: 13 }}>
          <span>{status.progress.xp} XP</span>
          <span>Streak {status.progress.streak}</span>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
        {site ? `${site}: ${formatRemaining(status.remainingMs)}` : formatRemaining(null)}
      </p>
      {last && (
        <p className="muted" style={{ fontSize: 13 }}>
          Last session: {last.skipped ? "skipped" : `${Math.round((last.accuracy ?? 0) * 100)}% quiz`} · +{last.xp} XP
        </p>
      )}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" onClick={() => chrome.runtime.openOptionsPage()}>
          Settings
        </button>
        <button
          className="btn secondary"
          onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("intervention.html") })}
        >
          Practice now
        </button>
      </div>
    </div>
  );
}
