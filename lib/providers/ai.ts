import type { AIProvider, LiveEvaluation, ReportDraft } from "./types";

export function getAIProvider(): AIProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    return createOpenAIProvider(apiKey);
  }
  return stubAIProvider;
}

export const stubAIProvider: AIProvider = {
  async evaluateWindow() {
    return {
      room_state: "normal",
      confidence: 0.4,
      signals: [],
      rubric_observations: [],
    } satisfies LiveEvaluation;
  },
  async generateReport() {
    return {
      metricScores: [],
      strengths: ["Practice continued with available transcript evidence."],
      habitsToWorkOn: ["Add vendor AI keys to generate scored mentor reports."],
      summary: "Stub report: OpenAI is not configured.",
      model: "stub",
    } satisfies ReportDraft;
  },
  async moderationCheck() {
    return { flagged: false, categories: [] };
  },
};

function createOpenAIProvider(apiKey: string): AIProvider {
  const liveModel = process.env.OPENAI_LIVE_MODEL ?? "gpt-4.1-mini";
  const reportModel = process.env.OPENAI_REPORT_MODEL ?? "gpt-4.1";

  async function completeJson<T>(model: string, system: string, user: string): Promise<T> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status}`);
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned an empty response");
    return JSON.parse(content) as T;
  }

  return {
    async evaluateWindow(input) {
      return completeJson<LiveEvaluation>(
        liveModel,
        "You evaluate live coaching practice. Return only JSON matching the required schema. Never include chain-of-thought. Cite short transcript quotes only.",
        `Rubric:\n${input.rubricInstructions}\n\nTranscript window:\n${input.transcript}`,
      );
    },
    async generateReport(input) {
      return completeJson<ReportDraft>(
        reportModel,
        "You write mentor-facing coaching reports. Return only JSON. Do not include chain-of-thought. Ground claims in transcript evidence.",
        `Rubric:\n${input.rubricInstructions}\n\nTranscript:\n${input.transcript}`,
      );
    },
    async moderationCheck(text) {
      const response = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: text }),
      });
      if (!response.ok) {
        throw new Error(`OpenAI moderation failed: ${response.status}`);
      }
      const payload = (await response.json()) as {
        results?: Array<{ flagged?: boolean; categories?: Record<string, boolean> }>;
      };
      const result = payload.results?.[0];
      return {
        flagged: Boolean(result?.flagged),
        categories: Object.entries(result?.categories ?? {})
          .filter(([, value]) => value)
          .map(([key]) => key),
      };
    },
  };
}
