export const ANSWER_WEBHOOK_URL =
  "https://n8n.srv851223.hstgr.cloud/webhook-test/answer";

export type AnswerWebhookResponse = {
  id: string;
  session_id: string;
  question_id: number;
  question_text: string;
  score: number;
  feedback: string;
  strength: string;
  improvement: string;
  /** Strong answer sample from the backend (snake_case or camelCase in raw JSON). */
  example_answer?: string | null;
  keywords_mentioned: string[] | null;
  framework_used: string;
  answered_at: string;
  user_id: string;
};

function mergeWebhookLayers(input: unknown): Record<string, unknown> {
  let cur: unknown = input;
  if (Array.isArray(cur) && cur[0] && typeof cur[0] === "object") {
    cur = cur[0];
  }
  if (!cur || typeof cur !== "object") return {};

  let o = { ...(cur as Record<string, unknown>) };
  const mergeIn = (nested: unknown) => {
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      o = { ...o, ...(nested as Record<string, unknown>) };
    }
  };
  const mergeInMaybeString = (v: unknown) => {
    if (typeof v === "string") {
      try {
        mergeIn(JSON.parse(v) as unknown);
      } catch {
        // ignore
      }
      return;
    }
    mergeIn(v);
  };
  mergeInMaybeString(o.json);
  mergeInMaybeString(o.data);
  mergeInMaybeString(o.output);
  mergeInMaybeString(o.result);
  mergeInMaybeString(o.response);
  if (typeof o.body === "string") {
    try {
      const parsed = JSON.parse(o.body) as unknown;
      mergeIn(parsed);
    } catch {
      // ignore non-JSON body
    }
  }
  return o;
}

function isExampleAnswerKey(key: string): boolean {
  const n = key.toLowerCase().replace(/[_\s-]/g, "");
  return (
    n === "exampleanswer" ||
    n.endsWith("exampleanswer") ||
    n === "idealanswer" ||
    n === "sampleanswer" ||
    n === "modelanswer" ||
    n === "referenceanswer" ||
    n === "exampleresponse" ||
    n === "suggestedanswer"
  );
}

function coerceToAnswerString(value: unknown): string | null {
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return null;
    if ((t.startsWith("{") || t.startsWith("[")) && t.length < 200_000) {
      try {
        const parsed = JSON.parse(t) as unknown;
        const inner = coerceToAnswerString(parsed);
        if (inner) return inner;
      } catch {
        // not JSON — use as plain text
      }
    }
    return t;
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);
    if (parts.length) return parts.join("\n\n");
    return null;
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const key of ["text", "content", "message", "answer", "value", "body", "output"]) {
      const inner = o[key];
      const s = coerceToAnswerString(inner);
      if (s) return s;
    }
  }
  return null;
}

/**
 * Walks nested webhook / LLM shapes (n8n json wrappers, stringified JSON, etc.)
 * and returns the first non-empty example-answer-like string.
 */
export function extractExampleAnswerFromPayload(input: unknown): string | null {
  const seen = new Set<unknown>();

  function walk(obj: unknown, depth: number): string | null {
    if (depth > 12 || obj === null || obj === undefined) return null;
    if (typeof obj === "string") {
      const t = obj.trim();
      if (!t) return null;
      if ((t.startsWith("{") || t.startsWith("[")) && t.length < 200_000) {
        try {
          return walk(JSON.parse(t) as unknown, depth + 1);
        } catch {
          return null;
        }
      }
      return null;
    }
    if (typeof obj !== "object") return null;
    if (seen.has(obj)) return null;
    seen.add(obj);

    if (Array.isArray(obj)) {
      for (const item of obj) {
        const r = walk(item, depth + 1);
        if (r) return r;
      }
      return null;
    }

    const record = obj as Record<string, unknown>;
    for (const [k, v] of Object.entries(record)) {
      if (isExampleAnswerKey(k)) {
        const s = coerceToAnswerString(v);
        if (s) return s;
      }
    }
    for (const v of Object.values(record)) {
      const r = walk(v, depth + 1);
      if (r) return r;
    }
    return null;
  }

  const flat = mergeWebhookLayers(input);
  for (const [k, v] of Object.entries(flat)) {
    if (isExampleAnswerKey(k)) {
      const s = coerceToAnswerString(v);
      if (s) return s;
    }
  }
  const fromFlat = walk(flat, 0);
  if (fromFlat) return fromFlat;
  return walk(input, 0);
}

export function normalizeAnswerWebhookResponse(input: unknown): AnswerWebhookResponse {
  const flat = mergeWebhookLayers(input);
  const example = extractExampleAnswerFromPayload(input);
  const merged = {
    ...flat,
    ...(example ? { example_answer: example } : {}),
  } as AnswerWebhookResponse;
  return merged;
}

export async function submitAnswerMultipart(params: {
  audio: Blob;
  audioFilename: string;
  userId: string;
  sessionId: string;
  questionId: number;
}): Promise<AnswerWebhookResponse> {
  const form = new FormData();
  form.append("audio", params.audio, params.audioFilename);
  form.append("user_id", params.userId);
  form.append("session_id", params.sessionId);
  form.append("question_id", String(params.questionId));

  const res = await fetch(ANSWER_WEBHOOK_URL, {
    method: "POST",
    body: form,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Answer request failed (${res.status})`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON from answer webhook");
  }

  const normalized = normalizeAnswerWebhookResponse(json);
  const exampleExtracted = extractExampleAnswerFromPayload(json);

  const shouldLogAnswerResponse =
    typeof window !== "undefined" &&
    (process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_DEBUG_ANSWER_WEBHOOK === "true");

  if (shouldLogAnswerResponse) {
    const maxPreview = 24_000;
    const bodyPreview =
      text.length > maxPreview ? `${text.slice(0, maxPreview)}… (${text.length} chars total)` : text;
    console.groupCollapsed("[PrepAI] Answer webhook response");
    console.log("URL:", ANSWER_WEBHOOK_URL);
    console.log("HTTP status:", res.status);
    console.log("Raw body (string):", bodyPreview);
    console.log("Parsed JSON:", json);
    console.log("Normalized object:", normalized);
    console.log("example_answer on normalized:", normalized.example_answer);
    console.log("extractExampleAnswerFromPayload(json):", exampleExtracted);
    console.groupEnd();
  }

  return normalized;
}
