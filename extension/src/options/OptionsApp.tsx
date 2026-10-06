import { useEffect, useState } from "react";
import {
  DEFAULT_SITES,
  DURATION_OPTIONS,
  INTEREST_LABELS,
  INTERESTS,
  THRESHOLD_OPTIONS,
  type DurationMinutes,
  type Interest,
  type ThresholdMinutes,
} from "../shared/constants";
import { loadState, patchState } from "../shared/storage";
import type { Settings } from "../shared/types";

export function OptionsApp() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    void loadState().then((s) => setSettings(s.settings));
  }, []);

  if (!settings) return <div className="wrap">Loading…</div>;

  function toggleInterest(id: Interest) {
    setSettings((prev) => {
      if (!prev) return prev;
      const has = prev.interests.includes(id);
      const interests = has
        ? prev.interests.filter((x) => x !== id)
        : [...prev.interests, id];
      return { ...prev, interests };
    });
    setSaved(false);
  }

  function toggleSite(id: string) {
    setSettings((prev) => {
      if (!prev) return prev;
      const has = prev.enabledSiteIds.includes(id);
      const enabledSiteIds = has
        ? prev.enabledSiteIds.filter((x) => x !== id)
        : [...prev.enabledSiteIds, id];
      return { ...prev, enabledSiteIds };
    });
    setSaved(false);
  }

  async function save() {
    if (!settings) return;
    if (settings.interests.length === 0 || settings.enabledSiteIds.length === 0) {
      setWarning("Pick at least one interest and one site.");
      return;
    }
    setWarning(null);
    await patchState((state) => {
      state.settings = { ...settings, onboardingComplete: true };
    });
    try {
      await chrome.runtime.sendMessage({ type: "SETTINGS_UPDATED" });
    } catch {
      // Ignore invalidated extension contexts while Chrome is tearing down the extension page.
    }
    setSaved(true);
  }

  return (
    <div className="wrap">
      <p className="kicker">Cognite</p>
      <h1 className="sans" style={{ marginTop: 0 }}>
        Reignite your cognition
      </h1>
      <p className="muted">
        Cognite is inspired by the idea of switching from long stretches of passive
        consumption into short bursts of active reading. It does not measure brain
        networks. It tracks time on sites you select, then offers a voluntary
        challenge you can always skip.
      </p>

      <section className="card" style={{ marginTop: 20 }}>
        <h2 className="sans" style={{ marginTop: 0, fontSize: 18 }}>
          Interests
        </h2>
        <div className="row">
          {INTERESTS.map((id) => (
            <button
              key={id}
              className={`chip ${settings.interests.includes(id) ? "on" : ""}`}
              onClick={() => toggleInterest(id)}
            >
              {INTEREST_LABELS[id]}
            </button>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 className="sans" style={{ marginTop: 0, fontSize: 18 }}>
          Challenge length
        </h2>
        <div className="row">
          {DURATION_OPTIONS.map((n) => (
            <button
              key={n}
              className={`chip ${settings.durationMinutes === n ? "on" : ""}`}
              onClick={() => {
                setSettings({ ...settings, durationMinutes: n as DurationMinutes });
                setSaved(false);
              }}
            >
              {n} min
            </button>
          ))}
        </div>
        <h2 className="sans" style={{ fontSize: 18 }}>
          Time on a selected site before a prompt
        </h2>
        <div className="row">
          {THRESHOLD_OPTIONS.map((n) => (
            <button
              key={n}
              className={`chip ${settings.thresholdMinutes === n ? "on" : ""}`}
              onClick={() => {
                setSettings({
                  ...settings,
                  thresholdMinutes: n as ThresholdMinutes,
                });
                setSaved(false);
              }}
            >
              {n} min{n === 1 ? " (demo)" : ""}
            </button>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 className="sans" style={{ marginTop: 0, fontSize: 18 }}>
          Sites to watch
        </h2>
        {DEFAULT_SITES.map((site) => (
          <label key={site.id} className="row" style={{ margin: "8px 0" }}>
            <input
              type="checkbox"
              checked={settings.enabledSiteIds.includes(site.id)}
              onChange={() => toggleSite(site.id)}
            />
            <span>{site.label}</span>
          </label>
        ))}
      </section>

      <div className="row" style={{ marginTop: 20 }}>
        <button className="btn" onClick={() => void save()}>
          Save
        </button>
        {saved && <span className="muted">Saved. You can close this tab.</span>}
        {warning && <span className="muted">{warning}</span>}
      </div>
    </div>
  );
}
