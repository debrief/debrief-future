Four attempts to run Playwright against a VS Code workbench inside a sandboxed environment. Four failures. Then the pieces came together.

Standard Playwright CDN downloads are blocked (403). The Lambda-optimized @sparticuz/chromium crashes on VS Code's complex DOM. code-server's WebSocket auth depends on a proprietary module. And multi-process Chromium kills its own renderer when you take a screenshot in a container.

The fix was three substitutions and a flag: host Chromium as a GitHub Release asset instead of using CDN, use openvscode-server instead of code-server, run `--single-process --no-zygote` instead of default multi-process, and close the Welcome tab that silently captures keyboard focus.

Result: Playwright driving a full VS Code command palette, Quick Open dialog, and file navigation -- all inside the sandbox. The E2E test infrastructure is ready for real workflow tests.

[Read the full story][BLOG_URL]

#FutureDebrief #Playwright #VSCode
