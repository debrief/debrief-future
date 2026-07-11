/**
 * Helpers for constructing `LanguageModelToolResult` payloads (#284).
 *
 * The tools return compact JSON/markdown text parts the model reads back
 * (research R1). Centralised here so every tool emits results the same way.
 */

import * as vscode from 'vscode';

/** Wrap plain text as a single-part tool result. */
export function textResult(text: string): vscode.LanguageModelToolResult {
  return new vscode.LanguageModelToolResult([
    new vscode.LanguageModelTextPart(text),
  ]);
}

/** Wrap a JSON-serialisable value as a pretty-printed text part. */
export function jsonResult(value: unknown): vscode.LanguageModelToolResult {
  return textResult(JSON.stringify(value, null, 2));
}
