export type JsonSchema = Record<string, unknown>;

export type AiConversationMessage = {
  content: string;
  role: "model" | "user";
};

export type StructuredGenerationRequest = {
  history?: AiConversationMessage[];
  responseSchema: JsonSchema;
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
  temperature?: number;
};

export type AiProviderResult<TOutput> = {
  model: string;
  output: TOutput;
  provider: "google-gemini";
};

export interface AiProvider {
  readonly configured: boolean;
  readonly model: string;
  readonly provider: "google-gemini";
  generateStructured<TOutput>(
    request: StructuredGenerationRequest,
  ): Promise<AiProviderResult<TOutput>>;
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

export type GeminiAiProviderOptions = {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
};

export class GeminiAiProvider implements AiProvider {
  readonly configured: boolean;
  readonly model: string;
  readonly provider = "google-gemini" as const;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options: GeminiAiProviderOptions) {
    this.apiKey = options.apiKey?.trim() ?? "";
    this.configured = this.apiKey.length > 0;
    this.model = options.model?.trim() || "gemini-3.5-flash-lite";
    this.timeoutMs = options.timeoutMs ?? 45_000;
  }

  async generateStructured<TOutput>(
    request: StructuredGenerationRequest,
  ): Promise<AiProviderResult<TOutput>> {
    if (!this.configured) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const conversation = [
      ...(request.history ?? []),
      { content: request.userPrompt, role: "user" as const },
    ];
    const contents: Array<{ parts: Array<{ text: string }>; role: "model" | "user" }> = [];
    for (const message of conversation) {
      const previous = contents.at(-1);
      if (previous?.role === message.role) {
        previous.parts[0]!.text += `\n\n${message.content}`;
      } else {
        contents.push({ parts: [{ text: message.content }], role: message.role });
      }
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
        {
          body: JSON.stringify({
            contents,
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: request.responseSchema,
              ...(this.model.startsWith("gemini-3")
                ? {
                    thinkingConfig: {
                      thinkingLevel: request.thinkingLevel ?? "low",
                    },
                  }
                : { temperature: request.temperature ?? 0.2 }),
            },
            systemInstruction: {
              parts: [{ text: request.systemPrompt }],
            },
          }),
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          method: "POST",
          signal: controller.signal,
        },
      );

      const payload = (await response.json()) as GeminiResponse;
      if (!response.ok) {
        throw new Error(payload.error?.message || `Gemini request failed (${response.status})`);
      }

      const text = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim();
      if (!text) {
        throw new Error("Gemini returned an empty structured response");
      }

      return {
        model: this.model,
        output: JSON.parse(text) as TOutput,
        provider: this.provider,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
