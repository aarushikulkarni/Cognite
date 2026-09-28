import { API_BASE } from "./constants";
import type { GradeResult, InterventionPayload } from "./types";

const KEY = import.meta.env.VITE_COGNITE_API_KEY as string | undefined;

function headers(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (KEY) h["X-Cognite-Key"] = KEY;
  return h;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function generateIntervention(input: {
  interests: string[];
  durationMinutes: 3 | 4 | 5;
}): Promise<InterventionPayload> {
  const res = await fetch(`${API_BASE}/v1/interventions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Generate failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as Omit<InterventionPayload, "usedFixture">;
  return { ...data, usedFixture: false };
}

export async function gradeIntervention(
  id: string,
  answers: Record<string, string>,
): Promise<GradeResult> {
  const res = await fetch(`${API_BASE}/v1/interventions/${id}/grade`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Grade failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GradeResult;
}
