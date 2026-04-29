/**
 * SC-009 grep test for #235 — fails if the legacy host-level prompts
 * survive in `apps/vscode/src/commands/captureScene.ts`.
 *
 * Scope:
 *   - `vscode.window.showInputBox` MUST NOT be referenced anywhere in the
 *     file. (#235 routes the first-capture name through the panel.)
 *   - Modal `vscode.window.showInformationMessage(…, { modal: true }, …)`
 *     MUST NOT survive. (#235 routes the duplicate-timestamp resolution
 *     through the panel banner.)
 *
 * The check runs on the file's source text rather than its AST so it
 * catches comments and strings as well — keeps the literal token from
 * silently re-entering the file.
 *
 * If this test ever fails, the offending line is the legacy prompt:
 * replace it with a panel round-trip via `context.panelView.*`.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const captureSceneSourcePath = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'commands',
  'captureScene.ts',
);

describe('captureScene.ts — legacy element absence (SC-009)', () => {
  it('source file exists at the documented path', () => {
    expect(fs.existsSync(captureSceneSourcePath)).toBe(true);
  });

  it('does NOT reference showInputBox anywhere in the file', () => {
    const src = fs.readFileSync(captureSceneSourcePath, 'utf-8');
    // Single token; any occurrence (call, type, comment) fails the test.
    expect(src.includes('showInputBox')).toBe(false);
  });

  it('does NOT reference showInformationMessage anywhere in the file', () => {
    const src = fs.readFileSync(captureSceneSourcePath, 'utf-8');
    expect(src.includes('showInformationMessage')).toBe(false);
  });

  it("does NOT contain the legacy modal's literal 'Replace' / 'Offset (+1 s)' arguments", () => {
    const src = fs.readFileSync(captureSceneSourcePath, 'utf-8');
    // The legacy modal call passed these as quoted literals:
    //   showInformationMessage(message, { modal: true }, 'Replace', 'Offset (+1 s)')
    // The new panel-driven banner uses typed action discriminants, never
    // these strings as code.
    expect(src.includes("'Replace'")).toBe(false);
    expect(src.includes("'Offset (+1 s)'")).toBe(false);
  });
});
