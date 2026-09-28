import { useEffect, useMemo, useState } from "react";
import { generateIntervention, gradeIntervention } from "../shared/api";
import { FIXTURE_INTERVENTION, gradeFixture } from "../shared/fixture";
import { loadState } from "../shared/storage";
import type { GradeResult, InterventionPayload } from "../shared/types";

type Phase = "loading" | "reading" | "quiz" | "results";

function renderMarkdown(md: string): string {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export function InterventionApp() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<InterventionPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [xp, setXp] = useState<number>(0);

  useEffect(() => {
    void (async () => {
      const state = await loadState();
      const pending = await chrome.storage.session.get("pendingSiteId");
      setSiteId((pending.pendingSiteId as string | undefined) ?? null);
      try {
        const generated = await generateIntervention({
          interests: state.settings.interests,
          durationMinutes: state.settings.durationMinutes,
        });
        setItem(generated);
        setPhase("reading");
      } catch (err) {
        setItem(FIXTURE_INTERVENTION);
        setError(err instanceof Error ? err.message : "API unavailable");
        setPhase("reading");
      }
    })();
  }, []);

  const html = useMemo(
    () => (item ? renderMarkdown(item.passageMarkdown) : ""),
    [item],
  );

  async function skip() {
    await chrome.runtime.sendMessage({
      type: "INTERVENTION_COMPLETE",
      payload: {
        siteId,
        skipped: true,
        grade: null,
        title: item?.title ?? null,
        passageMarkdown: null,
        usedFixture: item?.usedFixture ?? false,
      },
    });
    setPhase("results");
    setGrade(null);
    setXp(0);
  }

  async function submit() {
    if (!item) return;
    try {
      let result: GradeResult;
      if (item.usedFixture || item.id.startsWith("fixture")) {
        result = gradeFixture(answers);
      } else {
        result = await gradeIntervention(item.id, answers);
      }
      setGrade(result);
      const progress = await chrome.runtime.sendMessage({
        type: "INTERVENTION_COMPLETE",
        payload: {
          siteId,
          skipped: false,
          grade: result,
          title: item.title,
          passageMarkdown: item.passageMarkdown,
          usedFixture: item.usedFixture,
        },
      });
      setXp(progress?.sessions?.[0]?.xp ?? result.xpAwarded);
      setPhase("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not grade the quiz.");
    }
  }

  if (phase === "loading" || !item) {
    return (
      <div className="wrap">
        <p className="kicker">Cognite</p>
        <h1 className="sans">Preparing a short reading…</h1>
        <p className="muted">Grounding a passage in your selected interests.</p>
      </div>
    );
  }

  if (phase === "results") {
    return (
      <div className="wrap">
        <p className="kicker">Cognite</p>
        <h1 className="sans">Nice work</h1>
        {grade ? (
          <>
            <p>
              You answered {grade.correctCount} of {grade.total} correctly ({grade.scorePct}%).
            </p>
            <p className="muted">+{xp} XP added to your Cognitive Score.</p>
            <div className="card">
              {item.questions.map((q) => {
                const row = grade.perQuestion.find((p) => p.questionId === q.id);
                return (
                  <p key={q.id}>
                    {row?.correct ? "Correct" : "Review"}: {q.prompt}
                  </p>
                );
              })}
            </div>
          </>
        ) : (
          <p className="muted">Skipped — no XP change. You can try again anytime from the popup.</p>
        )}
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" onClick={() => window.close()}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <p className="kicker">Cognite · reignite your cognition</p>
      <h1 className="sans">{item.title}</h1>
      <p className="muted">
        About {item.estimatedMinutes} min · {item.usedFixture ? "offline sample reading" : "grounded in Cognite’s knowledge base"}
      </p>
      {error && item.usedFixture && (
        <p className="muted">The generator was offline, so this is a local sample. {error}</p>
      )}

      {phase === "reading" && (
        <>
          <article className="card passage" dangerouslySetInnerHTML={{ __html: html }} />
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => setPhase("quiz")}>
              I’m ready for the quiz
            </button>
            <button className="btn secondary" onClick={() => void skip()}>
              Skip
            </button>
          </div>
        </>
      )}

      {phase === "quiz" && (
        <>
          {item.questions.map((q) => (
            <section key={q.id} className="card" style={{ marginTop: 12 }}>
              <h2 className="sans" style={{ fontSize: 18, marginTop: 0 }}>
                {q.prompt}
              </h2>
              {q.choices.map((c) => (
                <button
                  key={c.id}
                  className={`choice ${answers[q.id] === c.id ? "selected" : ""}`}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: c.id }))}
                >
                  {c.text}
                </button>
              ))}
            </section>
          ))}
          <div className="row" style={{ marginTop: 16 }}>
            <button
              className="btn"
              disabled={item.questions.some((q) => !answers[q.id])}
              onClick={() => void submit()}
            >
              Submit
            </button>
            <button className="btn secondary" onClick={() => void skip()}>
              Skip
            </button>
          </div>
          {error && !item.usedFixture && <p className="muted">{error}</p>}
        </>
      )}
    </div>
  );
}
