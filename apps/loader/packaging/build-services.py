#!/usr/bin/env python3
"""
Build Python services as PyInstaller executables for bundling with Electron app.

This script:
1. Uses uv to sync workspace dependencies
2. Creates PyInstaller executables for debrief-stac and debrief-io
3. Outputs everything to packaging/dist/ ready for electron-builder

Usage:
    python packaging/build-services.py [--platform linux|darwin|win32]

Prerequisites:
    - uv must be installed (pip install uv)
    - Run from apps/loader directory or repo root
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


# Services to build
SERVICES = [
    {
        "name": "debrief-stac",
        "module": "debrief_stac.cli",
        "path": "services/stac",
    },
    {
        "name": "debrief-io",
        "module": "debrief_io.cli",
        "path": "services/io",
    },
]


def get_repo_root() -> Path:
    """Get the repository root directory."""
    current = Path(__file__).parent
    while current != current.parent:
        if (current / "pyproject.toml").exists():
            content = (current / "pyproject.toml").read_text()
            if "[tool.uv.workspace]" in content:
                return current
        current = current.parent
    raise RuntimeError("Could not find repository root with uv workspace")


def get_dist_dir() -> Path:
    """Get the dist directory for built artifacts."""
    return Path(__file__).parent / "dist"


def sync_workspace(repo_root: Path) -> None:
    """Sync workspace dependencies using uv."""
    print("Syncing workspace dependencies...")
    result = subprocess.run(
        ["uv", "sync"],
        cwd=repo_root,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print("ERROR syncing workspace:")
        print(result.stderr)
        raise RuntimeError("Failed to sync workspace")
    print("  Workspace synced.")


def build_pyinstaller_exe(
    service: dict,
    repo_root: Path,
    dist_dir: Path,
) -> Path:
    """Build a PyInstaller executable for a service."""
    name = service["name"]
    module = service["module"]

    output_dir = dist_dir / "services"
    output_dir.mkdir(parents=True, exist_ok=True)

    build_dir = dist_dir / "build" / name
    build_dir.mkdir(parents=True, exist_ok=True)

    print(f"  Building {name}...")

    # Create a temporary entry point script for PyInstaller
    entry_script = build_dir / f"{name}_entry.py"
    entry_script.write_text(f"""#!/usr/bin/env python3
from {module} import main
if __name__ == "__main__":
    main()
""")

    ext = ".exe" if sys.platform == "win32" else ""

    cmd = [
        "uv", "run", "pyinstaller",
        "--onefile",
        "--name", name,
        "--distpath", str(output_dir),
        "--workpath", str(build_dir),
        "--specpath", str(build_dir),
        "--clean",
        "--noconfirm",
        # Hidden imports for pydantic
        "--hidden-import", "pydantic",
        "--hidden-import", "pydantic_core",
        "--hidden-import", "pydantic.deprecated",
        "--hidden-import", "pydantic.deprecated.decorator",
        "--collect-all", "pydantic",
        "--collect-all", "pydantic_core",
        # Hidden imports for our modules
        "--hidden-import", module.rsplit(".", 1)[0],  # e.g., debrief_stac
        # The entry point script
        str(entry_script),
    ]

    result = subprocess.run(
        cmd,
        cwd=repo_root,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(f"  ERROR building {name}:")
        print(result.stdout)
        print(result.stderr)
        raise RuntimeError(f"Failed to build {name}")

    output_path = output_dir / f"{name}{ext}"
    if output_path.exists():
        size_mb = output_path.stat().st_size / 1024 / 1024
        print(f"    Created {output_path.name} ({size_mb:.1f} MB)")
    else:
        raise RuntimeError(f"Expected output not found: {output_path}")

    return output_path


def ensure_tools_installed(repo_root: Path) -> None:
    """Ensure required tools are installed."""
    # Check for uv
    result = subprocess.run(["uv", "--version"], capture_output=True)
    if result.returncode != 0:
        print("ERROR: uv is not installed. Install with: pip install uv")
        sys.exit(1)

    # Add pyinstaller to the workspace
    print("Ensuring PyInstaller is available...")
    result = subprocess.run(
        ["uv", "add", "--dev", "pyinstaller"],
        cwd=repo_root,
        capture_output=True,
        text=True,
    )
    # Ignore errors if already installed


def main():
    parser = argparse.ArgumentParser(
        description="Build Python services for Electron bundling"
    )
    parser.add_argument(
        "--platform",
        choices=["linux", "darwin", "win32"],
        default=sys.platform,
        help="Target platform (default: current platform)",
    )
    args = parser.parse_args()

    repo_root = get_repo_root()
    dist_dir = get_dist_dir()

    print(f"Repository root: {repo_root}")
    print(f"Output directory: {dist_dir}")
    print(f"Target platform: {args.platform}")
    print()

    # Ensure tools are available
    ensure_tools_installed(repo_root)

    # Clean previous build
    if dist_dir.exists():
        print("Cleaning previous build...")
        shutil.rmtree(dist_dir)
    dist_dir.mkdir(parents=True)

    # Sync workspace
    print("\n" + "=" * 50)
    sync_workspace(repo_root)

    # Build service executables
    print("\n" + "=" * 50)
    print("Building service executables...")
    for service in SERVICES:
        build_pyinstaller_exe(service, repo_root, dist_dir)

    # Clean up build artifacts
    build_dir = dist_dir / "build"
    if build_dir.exists():
        shutil.rmtree(build_dir)

    print("\n" + "=" * 50)
    print("Build complete!")
    print(f"Output directory: {dist_dir}")
    print("\nContents:")
    for item in sorted(dist_dir.rglob("*")):
        if item.is_file():
            rel_path = item.relative_to(dist_dir)
            size_mb = item.stat().st_size / 1024 / 1024
            print(f"  {rel_path} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
