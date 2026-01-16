# Quickstart: Debrief Demo Environment

This guide covers deploying and managing the browser-accessible Debrief demo environment.

## Prerequisites

- [Fly.io account](https://fly.io) with CLI installed (`flyctl`)
- GitHub repository with Actions enabled
- VNC password decided (for demo access)

## Initial Deployment

### 1. Create Fly.io App

```bash
cd demo/
fly launch --name debrief-demo --region lhr --no-deploy
```

### 2. Set Secrets

```bash
# VNC password (required for noVNC authentication)
fly secrets set PASSWORD=your-secure-password

# Optional: Custom artifact URL for testing PR builds
# fly secrets set DEBRIEF_ARTIFACT_URL=https://example.com/custom.tar.gz
```

### 3. Deploy

```bash
fly deploy
```

### 4. Verify

Open https://debrief-demo.fly.dev in your browser. You should see the noVNC connection page. Click "Connect" and enter your VNC password.

## Daily Operations

### Update to New Version

**Option A: Use latest from main branch**
```bash
fly machines restart
```
The container downloads the latest artifact on startup.

**Option B: Deploy specific version**
```bash
fly secrets set DEBRIEF_VERSION=v0.2.0
fly machines restart
```

**Option C: Test PR build**
```bash
# Get artifact URL from GitHub Actions workflow run
fly secrets set DEBRIEF_ARTIFACT_URL=https://github.com/.../debrief-demo.tar.gz
fly machines restart

# Reset to default after testing
fly secrets unset DEBRIEF_ARTIFACT_URL
fly machines restart
```

### View Logs

```bash
# Live logs
fly logs

# Recent logs
fly logs --no-tail
```

### Check Status

```bash
fly status
fly machines list
```

### SSH into Container

```bash
fly ssh console
```

### Force Restart

```bash
fly machines restart --force
```

## Cost Management

The demo uses Fly.io's autostop/autostart to minimize costs:

- **When idle**: Container suspends after ~5 minutes of no connections
- **When accessed**: Container resumes in <1 second (from suspended state)
- **Expected cost**: ~$2-5/month with intermittent usage

### Check Current Billing

```bash
fly billing
```

### Scale Up for Demo Session

If you need guaranteed availability for a scheduled demo:

```bash
# Keep machine running for 2 hours
fly machines update <machine-id> --schedule "*/5 * * * *"

# After demo, remove schedule
fly machines update <machine-id> --schedule ""
```

## Troubleshooting

### Container Won't Start

1. Check logs: `fly logs`
2. Verify artifact URL is accessible
3. Check secrets are set: `fly secrets list`

### Desktop is Blank/Black

1. SSH in: `fly ssh console`
2. Check VNC: `pgrep Xvnc`
3. Check XFCE: `pgrep xfce4-session`
4. Check logs: `cat /var/log/debrief-setup.log`

### VS Code Extension Not Working

1. SSH in: `fly ssh console`
2. Check extension: `code --list-extensions | grep debrief`
3. Reinstall: `code --install-extension /opt/debrief/extensions/debrief.vsix --force`

### File Associations Not Working

1. SSH in: `fly ssh console`
2. Update MIME database: `update-mime-database /config/.local/share/mime`
3. Update desktop database: `update-desktop-database /config/.local/share/applications`

### Artifact Download Fails

1. Check URL is public: `curl -I $DEBRIEF_ARTIFACT_URL`
2. Verify GitHub Release exists
3. Check for rate limiting (GitHub API)

## CI/CD Integration

### Trigger Artifact Build

Push to main branch or create a release:

```bash
git push origin main
# OR
gh release create v0.2.0 --title "v0.2.0" --notes "Release notes"
```

### Monitor Build

```bash
gh run list --workflow=build-demo-artifact.yml
gh run view <run-id>
```

### Test Workflow Manually

```bash
gh workflow run build-demo-artifact.yml -f version=test-build
```

## Architecture Overview

```
GitHub Actions (build) → GitHub Releases (artifact) → Fly.io Container (runtime)
                                                            ↓
                                                       noVNC (web)
                                                            ↓
                                                    Browser (user)
```

1. **Build**: CI compiles Python services, packages VS Code extension, creates tarball
2. **Store**: Artifact uploaded to GitHub Releases
3. **Deploy**: Container starts, downloads artifact, configures desktop
4. **Access**: User opens URL, connects via noVNC, sees Linux desktop with VS Code
