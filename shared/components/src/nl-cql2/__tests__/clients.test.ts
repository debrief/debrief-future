/**
 * Tests for LLM client factories (#188 T026).
 */

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  canonicalisePhrase,
  createPassthroughLLMClient,
  createRecordedLLMClient,
} from "../clients";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function buildPrompt(phrase: string): string {
  return `system preamble\n\nPhrase: ${phrase}`;
}

describe("canonicalisePhrase", () => {
  it("trims and lowercases", () => {
    expect(canonicalisePhrase("  UK Submarines  ")).toBe("uk submarines");
  });

  it("collapses internal whitespace", () => {
    expect(canonicalisePhrase("UK\tsubmarines  in\n2020")).toBe(
      "uk submarines in 2020",
    );
  });
});

describe("createRecordedLLMClient", () => {
  it("replays recorded responses on prompt-hash match", async () => {
    const phrase = "UK submarines";
    const prompt = buildPrompt(phrase);
    const responses = {
      [canonicalisePhrase(phrase)]: {
        rawResponse: "recorded-payload",
        promptHash: sha256(prompt),
        recordedAt: "2026-04-14T00:00:00Z",
        model: "test-model",
      },
    };
    const client = createRecordedLLMClient(responses);
    await expect(client.generate(prompt)).resolves.toBe("recorded-payload");
  });

  it("throws with a re-record diagnostic on phrase miss", async () => {
    const client = createRecordedLLMClient({});
    await expect(client.generate(buildPrompt("unknown phrase"))).rejects.toThrow(
      /no fixture/i,
    );
  });

  it("throws with a re-record diagnostic on prompt-hash mismatch", async () => {
    const phrase = "UK submarines";
    const prompt = buildPrompt(phrase);
    const responses = {
      [canonicalisePhrase(phrase)]: {
        rawResponse: "stale-payload",
        promptHash: "stale-hash",
        recordedAt: "2026-04-14T00:00:00Z",
        model: "test-model",
      },
    };
    const client = createRecordedLLMClient(responses);
    await expect(client.generate(prompt)).rejects.toThrow(/hash mismatch/i);
  });

  it("canonicalises the caller's phrase on lookup", async () => {
    const recordedPhrase = "uk submarines";
    const calledWith = "  UK Submarines  ";
    const prompt = buildPrompt(calledWith);
    const responses = {
      [recordedPhrase]: {
        rawResponse: "hit",
        promptHash: sha256(prompt),
        recordedAt: "2026-04-14T00:00:00Z",
        model: "test-model",
      },
    };
    const client = createRecordedLLMClient(responses);
    await expect(client.generate(prompt)).resolves.toBe("hit");
  });
});

describe("createPassthroughLLMClient", () => {
  it("forwards the prompt to the caller-supplied fn", async () => {
    let seen = "";
    const client = createPassthroughLLMClient(async (prompt) => {
      seen = prompt;
      return "forwarded";
    });
    await expect(client.generate("prompt-xyz")).resolves.toBe("forwarded");
    expect(seen).toBe("prompt-xyz");
  });

  it("propagates errors from the supplied fn", async () => {
    const client = createPassthroughLLMClient(async () => {
      throw new Error("upstream failed");
    });
    await expect(client.generate("x")).rejects.toThrow(/upstream failed/);
  });
});
