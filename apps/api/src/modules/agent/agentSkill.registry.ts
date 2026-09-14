import { randomUUID } from "node:crypto";
import type {
  AgentSkillMode,
  AgentSkillName,
  AgentSkillRunDto,
} from "@creator-flow/contracts";
import type { PoolClient } from "pg";

export type AgentSkillQueryable = Pick<PoolClient, "query">;

export type AgentSkillContext = {
  conversationId?: string;
  originMessageId?: string;
  queryable?: AgentSkillQueryable;
  userId: string;
};

export type AgentSkillHandlerResult<TOutput> = {
  output: TOutput;
  summary: string;
  targetId?: string | null;
  targetVersion?: number | null;
};

export type AgentSkillDefinition<TInput, TOutput> = {
  confirmationPolicy: "none" | "review-draft";
  description: string;
  inputSchema: Record<string, unknown>;
  mode: AgentSkillMode;
  name: AgentSkillName;
  outputSchema: Record<string, unknown>;
  target: AgentSkillRunDto["target"];
  execute: (
    context: AgentSkillContext,
    input: TInput,
  ) => Promise<AgentSkillHandlerResult<TOutput>>;
};

type StoredDefinition = AgentSkillDefinition<unknown, unknown>;

export type AgentSkillExecution<TOutput> =
  | { ok: true; output: TOutput; run: AgentSkillRunDto }
  | { error: unknown; ok: false; run: AgentSkillRunDto };

function errorSummary(name: AgentSkillName, error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.slice(0, 500);
  }
  return `Skill ${name} chưa thực hiện được.`;
}

export class AgentSkillRegistry {
  private readonly definitions = new Map<AgentSkillName, StoredDefinition>();

  register<TInput, TOutput>(definition: AgentSkillDefinition<TInput, TOutput>) {
    if (this.definitions.has(definition.name)) {
      throw new Error(`Agent skill already registered: ${definition.name}`);
    }
    this.definitions.set(definition.name, definition as StoredDefinition);
  }

  catalog() {
    return [...this.definitions.values()].map(
      ({
        confirmationPolicy,
        description,
        inputSchema,
        mode,
        name,
        outputSchema,
        target,
      }) => ({
        confirmationPolicy,
        description,
        inputSchema,
        mode,
        name,
        outputSchema,
        target,
      }),
    );
  }

  async execute<TInput, TOutput>(
    name: AgentSkillName,
    context: AgentSkillContext,
    input: TInput,
  ): Promise<AgentSkillExecution<TOutput>> {
    const definition = this.definitions.get(name);
    const executedAt = new Date().toISOString();
    const id = randomUUID();
    if (!definition) {
      const error = new Error(`Agent skill is not registered: ${name}`);
      return {
        error,
        ok: false,
        run: {
          executedAt,
          id,
          mode: "read",
          name,
          status: "failed",
          summary: error.message,
          target: null,
          targetId: null,
          targetVersion: null,
        },
      };
    }

    try {
      const result = await definition.execute(context, input);
      return {
        ok: true,
        output: result.output as TOutput,
        run: {
          executedAt,
          id,
          mode: definition.mode,
          name,
          status: "succeeded",
          summary: result.summary,
          target: definition.target,
          targetId: result.targetId ?? null,
          targetVersion: result.targetVersion ?? null,
        },
      };
    } catch (error) {
      return {
        error,
        ok: false,
        run: {
          executedAt,
          id,
          mode: definition.mode,
          name,
          status: "failed",
          summary: errorSummary(name, error),
          target: definition.target,
          targetId: null,
          targetVersion: null,
        },
      };
    }
  }
}
