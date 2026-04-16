/**
 * Tests for the LLM clients (#188 T026).
 *
 * - `RecordedLLMClient` hit / miss / prompt-hash mismatch.
 * - `PassthroughLLMClient` forwards the prompt correctly.
 */

import { describe, expect, it } from "vitest";
import {
  createPassthroughLLMClient,
  createRecordedLLMClient,
  extractPhraseFromPrompt,
} from "../clients";
import { sha256Hex } from "../hash";
import type { ResponseMap } from "../types";

describe("extractPhraseFromPrompt", () => {
  it("recovers the phrase from the final 'Phrase: …' line", () => {
    const prompt = "preamble\n\nPhrase: UK submarines";
    expect(extractPhraseFromPrompt(prompt)).toBe("UK submarines");
  });

  it("throws when the prompt does not end with a phrase line", () => {
    expect(() => extractPhraseFromPrompt("no phrase here")).toThrow();
  });
});

describe("createRecordedLLMClient (T026)", () => {
  it("returns the recorded response on a hit (canonicalised phrase, matching hash)", async () => {
    const prompt = "preamble\n\nPhrase: UK submarines";
    const hash = await sha256Hex(prompt);
    const responses: ResponseMap = {
      "uk submarines": {
        rawResponse: "{\"ok\": true}",
        promptHash: hash,
        recordedAt: "2026-04-16T00:00:00Z",
        model: "hand-authored",
      },
    };
    const client = createRecordedLLMClient(responses);
    const out = await client.generate(prompt);
    expect(out).toBe("{\"ok\": true}");
  });

  it("throws on unknown phrase", async () => {
    const prompt = "preamble\n\nPhrase: never seen before";
    const client = createRecordedLLMClient({});
    await expect(client.generate(prompt)).rejects.toThrow(
      /no recorded response/,
    );
  });

  it("throws on prompt-hash mismatch (stale fixture)", async () => {
    const prompt = "preamble\n\nPhrase: UK submarines";
    const responses: ResponseMap = {
      "uk submarines": {
        rawResponse: "{}",
        promptHash: "stale-hash-value-that-will-never-match-00000000",
        recordedAt: "2026-04-16T00:00:00Z",
        model: "hand-authored",
      },
    };
    const client = createRecordedLLMClient(responses);
    await expect(client.generate(prompt)).rejects.toThrow(
      /prompt-hash mismatch/,
    );
  });

  it("canonicalises the phrase for lookup (case + whitespace insensitive)", async () => {
    const prompt = "preamble\n\nPhrase:   UK  Submarines  ";
    const hash = await sha256Hex(prompt);
    const responses: ResponseMap = {
      "uk submarines": {
        rawResponse: "{\"hit\": true}",
        promptHash: hash,
        recordedAt: "",
        model: "hand-authored",
      },
    };
    const client = createRecordedLLMClient(responses);
    const out = await client.generate(prompt);
    expect(out).toBe("{\"hit\": true}");
  });
});

describe("createPassthroughLLMClient (T026)", () => {
  it("forwards the prompt to the supplied function", async () => {
    const calls: string[] = [];
    const client = createPassthroughLLMClient(async (prompt) => {
      calls.push(prompt);
      return "OK";
    });
    const out = await client.generate("hello");
    expect(out).toBe("OK");
    expect(calls).toEqual(["hello"]);
  });

  it("propagates errors from the underlying function", async () => {
    const client = createPassthroughLLMClient(async () => {
      throw new Error("boom");
    });
    await expect(client.generate("x")).rejects.toThrow(/boom/);
  });
});
