# Bundling Python Services for Distribution

This document describes how to bundle the Python services (debrief-stac, debrief-io) with the Electron app so they're self-contained and don't require separate Python installation.

## Architecture Overview

The Loader app communicates with Python services via JSON-RPC over stdin/stdout:

```
┌─────────────────────┐     JSON-RPC      ┌────────────────┐
│  Electron (main)    │◄─────────────────►│  debrief-stac  │
│  child_process.spawn│     stdin/stdout  │  (Python CLI)  │
└─────────────────────┘                   └────────────────┘
                          JSON-RPC
                      ◄─────────────────►  debrief-io
```

## Development Mode

In development, Python services are invoked from PATH (requires `uv pip install`):

```bash
# Install Python services in development
cd services/stac && uv pip install -e .
cd services/io && uv pip install -e .
cd services/config && uv pip install -e .

# Then run the Electron app
cd apps/loader
pnpm electron:dev
```

The services are then available as `debrief-stac`, `debrief-io` in PATH.

## Production Bundling Strategy

For distribution, Python services are bundled as standalone executables using PyInstaller.

### Step 1: Create PyInstaller Specs

Create a `packaging/` directory with PyInstaller spec files:

```
apps/loader/packaging/
├── debrief-io.spec
├── debrief-stac.spec
└── build.sh
```

#### Example spec file (`debrief-stac.spec`):

```python
# -*- mode: python ; coding: utf-8 -*-
block_cipher = None

a = Analysis(
    ['../../../services/stac/src/debrief_stac/cli.py'],
    pathex=['../../../services/stac/src'],
    binaries=[],
    datas=[],
    hiddenimports=['pydantic', 'debrief_schemas'],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='debrief-stac',
    debug=False,
    strip=False,
    upx=True,
    runtime_tmpdir=None,
    console=True,  # Required for stdin/stdout communication
)
```

### Step 2: Update electron-builder Config

Add Python executables to the build config in `package.json`:

```json
{
  "build": {
    "extraResources": [
      {
        "from": "packaging/dist/",
        "to": "python-services",
        "filter": ["debrief-stac*", "debrief-io*"]
      }
    ],
    "linux": {
      "target": ["AppImage", "deb"]
    },
    "mac": {
      "target": ["dmg"],
      "hardenedRuntime": true
    },
    "win": {
      "target": ["nsis"]
    }
  }
}
```

### Step 3: Update Service Paths in Code

The Electron app needs to find bundled executables at runtime. Update `src/main/ipc/stac.ts` and `io.ts`:

```typescript
import { app } from 'electron';
import { join } from 'path';

/**
 * Resolves the path to a bundled Python service executable.
 * In development, uses PATH lookup. In production, uses bundled executable.
 */
function getServicePath(name: string): string {
  if (app.isPackaged) {
    // Production: use bundled executable in extraResources
    const platform = process.platform;
    const ext = platform === 'win32' ? '.exe' : '';
    return join(process.resourcesPath, 'python-services', `${name}${ext}`);
  } else {
    // Development: use PATH lookup
    return name;
  }
}

const DEBRIEF_STAC_PATH = getServicePath('debrief-stac');
const DEBRIEF_IO_PATH = getServicePath('debrief-io');
```

### Step 4: Build Script

Create `packaging/build.sh`:

```bash
#!/bin/bash
set -e

# Build Python services as standalone executables
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Build debrief-stac
pyinstaller --distpath "$DIST_DIR" --workpath "$SCRIPT_DIR/build/stac" \
    --specpath "$SCRIPT_DIR" "$SCRIPT_DIR/debrief-stac.spec"

# Build debrief-io
pyinstaller --distpath "$DIST_DIR" --workpath "$SCRIPT_DIR/build/io" \
    --specpath "$SCRIPT_DIR" "$SCRIPT_DIR/debrief-io.spec"

echo "Python services built to: $DIST_DIR"
```

### Step 5: Complete Build Process

```bash
# 1. Install Python dependencies
cd services/stac && uv pip install -e .
cd ../io && uv pip install -e .
cd ../../apps/loader

# 2. Build Python executables
cd packaging && ./build.sh && cd ..

# 3. Build Electron app with bundled services
pnpm build
```

## Platform-Specific Notes

### Windows
- Executables get `.exe` extension
- May need to code-sign executables for Windows Defender

### macOS
- Executables need to be code-signed for Gatekeeper
- Use `hardenedRuntime: true` in electron-builder
- May need notarization for distribution outside App Store

### Linux
- Executables are portable across most distributions
- AppImage format includes all dependencies

## Size Optimization

PyInstaller executables can be large. To reduce size:

1. **Use UPX compression** - Already enabled in spec files
2. **Exclude unnecessary modules** - Add to `excludes` list
3. **Use `--onefile` mode** - Creates single executable (slower startup)
4. **Tree shaking** - Only import what's needed in Python code

## Alternative Approaches

### Shiv Archives (Recommended for Multi-Service)

[Shiv](https://shiv.readthedocs.io/) creates self-contained Python zip archives (`.pyz` files) that bundle dependencies into a single file. More efficient than PyInstaller for multiple services.

**Advantages:**
- Much smaller than PyInstaller (~5MB vs ~50MB per service)
- Faster build times
- Simpler dependency management
- All services can share a bundled Python runtime

**Structure:**
```
extraResources/
├── python/              # Embedded Python runtime (~30MB)
│   ├── python.exe       # Windows: python-embed
│   ├── python3          # Unix: python-build
│   └── Lib/ or lib/     # Standard library
└── services/
    ├── debrief-stac.pyz # Shiv archive (~5MB)
    └── debrief-io.pyz   # Shiv archive (~3MB)
```

**Building shiv archives:**
```bash
pip install shiv

# Build debrief-stac archive
shiv -c debrief-stac -o dist/debrief-stac.pyz ./services/stac

# Build debrief-io archive
shiv -c debrief-io -o dist/debrief-io.pyz ./services/io
```

**Spawning shiv archives:**
The Electron app spawns: `python path/to/service.pyz`

Update `service-paths.ts`:
```typescript
export function getServiceCommand(name: string): { executable: string; args: string[] } {
  if (!app.isPackaged) {
    return { executable: name, args: [] };  // Use PATH in dev
  }

  // Production: run shiv archive via bundled Python
  const ext = process.platform === 'win32' ? '.exe' : '';
  const pythonPath = join(process.resourcesPath, 'python', `python${ext}`);
  const archivePath = join(process.resourcesPath, 'services', `${name}.pyz`);

  return { executable: pythonPath, args: [archivePath] };
}
```

**Python Embeddable Package:**
- Windows: Download from python.org/downloads (e.g., `python-3.11.x-embed-amd64.zip`)
- macOS/Linux: Use [python-build-standalone](https://github.com/indygreg/python-build-standalone)

### PyInstaller (Current Default)
Creates standalone executables with Python bundled:
- No Python installation required
- Larger file sizes (~50MB per service)
- Platform-specific builds required
- Good for single-service apps

### Python Embedded Runtime (Direct)
Bundle Python interpreter + pip-installed packages:
- Single Python runtime shared across services
- Standard `site-packages` directory
- Larger than shiv but simpler debugging
- Closest to development environment

### WebAssembly (Experimental)
Compile Python services to WASM using Pyodide:
- No native executables needed
- Runs in Node.js or browser
- Limited library support (no native extensions)
- Performance overhead
- Best for web deployment

## Testing Bundled Distribution

After building:

```bash
# Test AppImage on Linux
./release/linux/Debrief-Loader-0.1.0.AppImage

# Test DMG on macOS
open release/mac/Debrief-Loader-0.1.0.dmg

# Test NSIS installer on Windows
./release/win/Debrief-Loader-Setup-0.1.0.exe
```

Verify that:
1. App launches without Python installed
2. Creating a local store works
3. Loading a .rep file succeeds
4. Features appear in the catalog
