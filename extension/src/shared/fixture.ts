import type { GradeResult, InterventionPayload } from "./types";

export const FIXTURE_INTERVENTION: InterventionPayload = {
  id: "fixture-local",
  title: "Attention is a practice, not a personality trait",
  estimatedMinutes: 3,
  usedFixture: true,
  passageMarkdown: `Most people talk about focus as if it were a talent you either have or lack. A more useful frame is that attention is a **practice**: a set of small returns to a chosen target after the mind wanders.

When you scroll a feed, the interface is designed to keep choosing the next target for you. That is not morally catastrophic, but it is cognitively cheap. You consume novelty without having to hold a goal, test an idea, or remember a structure. After enough of that, switching into reading, reasoning, or making something can feel oddly effortful — not because your brain is broken, but because you have been rehearsing a different skill.

A short reading challenge is a way to rehearse the other skill on purpose. You pick a topic you already care about. You stay with one argument long enough to notice its shape. Then you check whether you understood it. None of this measures hidden brain networks. It measures something simpler and more honest: did you engage?

Cognite exists for that switch. Skip whenever you want. The point is not restriction. The point is a voluntary invitation to **reignite your cognition** — to trade a few minutes of passive consumption for a few minutes of active comprehension.`,
  questions: [
    {
      id: "q1",
      prompt: "How does the passage describe attention?",
      choices: [
        { id: "a", text: "As a fixed talent some people are born with" },
        { id: "b", text: "As a practice of returning to a chosen target" },
        { id: "c", text: "As something that cannot be trained" },
        { id: "d", text: "As identical to willpower" },
      ],
    },
    {
      id: "q2",
      prompt: "According to the passage, why can feeds feel cognitively cheap?",
      choices: [
        { id: "a", text: "They require you to hold a long-term goal" },
        { id: "b", text: "They force you to remember a structure" },
        { id: "c", text: "They keep choosing the next target for you" },
        { id: "d", text: "They block all novelty" },
      ],
    },
    {
      id: "q3",
      prompt: "What does Cognite claim to measure in this MVP?",
      choices: [
        { id: "a", text: "Executive Control Network activity" },
        { id: "b", text: "Default Mode Network activity" },
        { id: "c", text: "Observable engagement, such as reading and comprehension" },
        { id: "d", text: "Sleep quality" },
      ],
    },
    {
      id: "q4",
      prompt: "What is the product’s stance on skipping an intervention?",
      choices: [
        { id: "a", text: "Skipping should be impossible" },
        { id: "b", text: "Skipping is allowed; the invitation is voluntary" },
        { id: "c", text: "Skipping deletes your score" },
        { id: "d", text: "Skipping is required after three minutes" },
      ],
    },
  ],
};

const FIXTURE_ANSWERS: Record<string, string> = {
  q1: "b",
  q2: "c",
  q3: "c",
  q4: "b",
};

export function gradeFixture(answers: Record<string, string>): GradeResult {
  const perQuestion = FIXTURE_INTERVENTION.questions.map((q) => {
    const correctChoiceId = FIXTURE_ANSWERS[q.id];
    return {
      questionId: q.id,
      correct: answers[q.id] === correctChoiceId,
      correctChoiceId,
    };
  });
  const correctCount = perQuestion.filter((p) => p.correct).length;
  const total = perQuestion.length;
  const scorePct = total ? Math.round((100 * correctCount) / total) : 0;
  const xpAwarded = 20 + Math.round(15 * (correctCount / Math.max(total, 1)));
  return { scorePct, correctCount, total, perQuestion, xpAwarded };
}
