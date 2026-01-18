# Deployment Checklist: Browser-Accessible Demo Environment

**Feature**: 005-chromeos-testing-setup
**Status**: Implementation Complete - Awaiting Deployment
**PR Branch**: `claude/chromeos-testing-setup-Mdtp3`

---

## 🚨 REMINDER: Post-Merge Deployment Required

This feature requires manual deployment to Fly.io after the PR is merged.
The demo environment will not be accessible until these steps are completed.

---

## Pre-Deployment (Before Merge)

- [x] All 63 implementation tasks complete
- [x] Evidence artifacts captured
- [x] Media content created (blog post, LinkedIn)
- [ ] PR created and reviewed
- [ ] PR merged to main

## Deployment Steps (After Merge)

### 1. Create Fly.io Application

```bash
cd demo/
fly apps create debrief-demo
```

### 2. Configure Secrets

```bash
# Set VNC password (required for authentication)
fly secrets set PASSWORD=<secure-password>

# Optional: Set specific version
fly secrets set DEBRIEF_VERSION=latest
```

### 3. Deploy Container

```bash
fly deploy
```

### 4. Verify Deployment

```bash
# Check status
fly status --app debrief-demo

# View logs
fly logs --app debrief-demo
```

### 5. Test Access

- [ ] Navigate to https://debrief-demo.fly.dev
- [ ] Connect with VNC password
- [ ] Verify XFCE desktop loads
- [ ] Test file manager and sample files

### 6. Run Automated Tests

```bash
# Trigger test workflow
gh workflow run test-demo.yml

# Monitor results
gh run list --workflow=test-demo.yml
```

### 7. Capture Final Evidence

After deployment, update evidence files with actual output:
- [ ] Update `test-summary.md` with real test results
- [ ] Capture `vnc-screenshot.png` of running desktop
- [ ] Update `container-startup.txt` with actual logs
- [ ] Update `fly-status.json` with actual status

---

## Verification Checklist

| Layer | Test | Command | Status |
|-------|------|---------|--------|
| 1 | URL Available | `curl -I https://debrief-demo.fly.dev` | ⏳ |
| 2 | Services Running | `fly ssh console --command "/opt/debrief/bin/test-service.sh"` | ⏳ |
| 3 | VNC Connectivity | `python tests/demo/test_vnc_connect.py` | ⏳ |
| 4 | Components | `fly ssh console --command "/opt/debrief/bin/test-components.sh"` | ⏳ |
| 5 | Desktop Integration | `fly ssh console --command "/opt/debrief/bin/test-desktop.sh"` | ⏳ |
| 6 | Data Pipeline | `fly ssh console --command "/opt/debrief/bin/test-pipeline.sh"` | ⏳ |
| 7 | E2E Workflow | `fly ssh console --command "/opt/debrief/bin/test-stac-workflow.sh"` | ⏳ |

---

## Troubleshooting

If deployment fails, check:
1. Fly.io authentication: `fly auth login`
2. App exists: `fly apps list`
3. Secrets set: `fly secrets list --app debrief-demo`
4. Logs: `fly logs --app debrief-demo`

---

## Contacts

- **Repository**: https://github.com/debrief/debrief-future
- **Fly.io Dashboard**: https://fly.io/apps/debrief-demo
- **Demo URL**: https://debrief-demo.fly.dev
