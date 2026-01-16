# Research: Browser-Accessible Demo Environment

**Feature**: 005-chromeos-testing-setup
**Date**: 2026-01-16

## Research Questions

### 1. LinuxServer Webtop Image Capabilities

**Question**: Does linuxserver/webtop:ubuntu-xfce include VS Code pre-installed?

**Decision**: VS Code must be installed separately; use `proot-apps` for persistence

**Rationale**: The webtop image does not include VS Code by default. However, LinuxServer provides `proot-apps`, a package manager that installs applications to the user's persistent `$HOME` directory (`/config` in the container).

**Alternatives Considered**:
- Install VS Code via apt-get at startup: Rejected because installed packages don't persist across container updates
- Pre-install VS Code in a custom Dockerfile layer: Rejected because this increases base image size and update frequency
- Use `proot-apps install vscode`: **Selected** - installs VS Code persistently to user directory

**Implementation**:
```bash
# In startup script, after artifact extraction
proot-apps install vscode
code --install-extension /opt/debrief/extensions/debrief.vsix --force
```

**Note**: As of June 2025, webtop images were rebased to the Selkies framework for improved streaming performance.

**Sources**:
- [LinuxServer Webtop Docs](https://docs.linuxserver.io/images/docker-webtop/)
- [LinuxServer docker-webtop GitHub](https://github.com/linuxserver/docker-webtop)

---

### 2. Fly.io Auto-Stop/Start Behavior

**Question**: How does Fly.io handle container auto-stop and what are cold start times?

**Decision**: Use `auto_stop_machines = "suspend"` for faster cold starts (<1s vs ~10-30s)

**Rationale**: Fly.io offers three autostop modes:
- `"off"`: Never stop machines (highest cost)
- `"stop"`: Stop machines when idle (cold start ~10-30s)
- `"suspend"`: Suspend machines using Firecracker snapshots (cold start ~hundreds of milliseconds)

Suspend captures the entire VM state (CPU registers, memory, file handles) and restores from snapshot instead of cold booting.

**Requirements for Suspend**:
- Memory ≤ 2 GB (our spec uses 1 GB)
- No swap configured
- No schedule configured
- No GPU configured

**Alternatives Considered**:
- `auto_stop_machines = "stop"`: Acceptable but slower cold starts
- `auto_stop_machines = "off"`: Rejected due to cost (paying for idle time)
- `auto_stop_machines = "suspend"`: **Selected** - meets all requirements, fastest restart

**Configuration**:
```toml
[http_service]
  auto_stop_machines = "suspend"  # Changed from "true"/"stop"
  auto_start_machines = true
  min_machines_running = 0
```

**Cold Start Expectation**: ~500ms-2s when suspended, vs ~30-60s when stopped (including artifact download).

**Sources**:
- [Fly.io Autostop/Autostart Docs](https://fly.io/docs/launch/autostop-autostart/)
- [Fly.io Suspend and Resume](https://fly.io/docs/reference/suspend-resume/)

---

### 3. Python Venv Portability

**Question**: How do we make a Python venv portable between CI build and container runtime?

**Decision**: Use `python -m venv --copies` + sed path rewriting

**Rationale**: Python venvs are inherently non-portable due to:
- Hardcoded absolute paths in `pyvenv.cfg`
- Absolute shebang lines in entry point scripts
- Platform-specific compiled extensions

However, portability is achievable when:
- Source and target machines have the same OS (Ubuntu 22.04)
- Same Python version (3.11)
- Same architecture (x86_64)

**Approach**:
1. Create venv with `--copies` to copy Python binary instead of symlinking
2. Use sed to rewrite paths from CI build location to container target path
3. Build artifact on `ubuntu-22.04` runner (matches container base)

**Alternatives Considered**:
- Recreate venv at container startup: Rejected - adds 30-60s to startup, requires network
- Use `virtualenv --relocatable`: Deprecated and unreliable
- Use shiv/pex for zipapps: Rejected - adds complexity, poor debugging experience
- Manual sed path rewriting: **Selected** - proven approach, fast startup

**Implementation**:
```bash
# In CI workflow
python -m venv --copies artifact/venv
artifact/venv/bin/pip install ./services/*

# Rewrite paths from build location to container location
sed -i 's|'$PWD'/artifact|/opt/debrief|g' artifact/venv/bin/*
sed -i 's|'$PWD'/artifact|/opt/debrief|g' artifact/venv/pyvenv.cfg
```

**Sources**:
- [Python venv Documentation](https://docs.python.org/3/library/venv.html)
- [Making venvs relocatable discussion](https://discuss.python.org/t/making-venvs-relocatable-friendly/96177)
- [Portable Virtualenv Blog](https://aarongorka.com/blog/portable-virtualenv/)

---

### 4. VS Code Extension Installation in Containers

**Question**: How do we install the Debrief VS Code extension in the container?

**Decision**: Use `code --install-extension` with `--force` flag in startup script

**Rationale**: VS Code CLI provides a straightforward way to install extensions from .vsix files. The `--force` flag ensures the extension is reinstalled even if already present (handles version updates).

**Implementation**:
```bash
# After VS Code is available via proot-apps
code --install-extension /opt/debrief/extensions/debrief.vsix --force
```

**Considerations**:
- VS Code must be installed before extension installation
- Extension installation happens on every container start (fast, ensures latest version)
- User settings persist in `/config` directory

---

## Summary of Decisions

| Topic | Decision | Key Rationale |
|-------|----------|---------------|
| VS Code Installation | `proot-apps install vscode` | Persists across container updates |
| Autostop Mode | `"suspend"` | Sub-second cold starts |
| Venv Portability | `--copies` + sed rewriting | Fast startup, no network needed |
| Extension Install | `code --install-extension` | Simple, handles updates |
| CI Runner | `ubuntu-22.04` | Matches container base OS |

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Venv path rewriting misses a file | Low | High | Add verification step in CI |
| Suspend not available for machine | Low | Low | Falls back to stop mode |
| proot-apps install fails | Low | Medium | Pre-verify in CI build |
| VS Code extension incompatible | Low | Medium | Test in matching environment |

## Open Questions

None - all research questions resolved.
