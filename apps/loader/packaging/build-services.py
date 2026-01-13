#!/usr/bin/env python3
"""
Build Python services as shiv archives for bundling with Electron app.

This script:
1. Uses uv to build wheel files for all workspace packages
2. Creates shiv archives for debrief-stac and debrief-io
3. Downloads Python embeddable runtime for the target platform
4. Outputs everything to packaging/dist/ ready for electron-builder

Usage:
    python packaging/build-services.py [--platform linux|darwin|win32]

Prerequisites:
    - uv must be installed (pip install uv)
    - Run from apps/loader directory or repo root
"""

import argparse
import os
import platform
import shutil
import subprocess
import sys
import tarfile
import tempfile
import zipfile
from pathlib import Path
from urllib.request import urlretrieve

# Python version to bundle
PYTHON_VERSION = "3.11.9"

# python-build-standalone releases
PYTHON_STANDALONE_VERSION = "20240415"
PYTHON_STANDALONE_BASE = f"https://github.com/indygreg/python-build-standalone/releases/download/{PYTHON_STANDALONE_VERSION}"

# Windows embeddable package from python.org
PYTHON_EMBED_WIN = f"https://www.python.org/ftp/python/{PYTHON_VERSION}/python-{PYTHON_VERSION}-embed-amd64.zip"

# Services to build (in dependency order)
SERVICES = [
    {
        "name": "debrief-stac",
        "path": "services/stac",
        "entry_point": "debrief-stac",
    },
    {
        "name": "debrief-io",
        "path": "services/io",
        "entry_point": "debrief-io",
    },
]

# All workspace packages that need to be built (in dependency order)
WORKSPACE_PACKAGES = [
    "shared/schemas",
    "services/stac",
    "services/io",
    "services/config",
]


def get_repo_root() -> Path:
    """Get the repository root directory."""
    # Walk up from this script to find pyproject.toml with workspace config
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


def get_python_standalone_url(target_platform: str) -> str:
    """Get the URL for python-build-standalone for the target platform."""
    if target_platform == "win32":
        return PYTHON_EMBED_WIN
    elif target_platform == "darwin":
        # macOS - use architecture-specific build
        arch = "aarch64" if platform.machine() == "arm64" else "x86_64"
        return f"{PYTHON_STANDALONE_BASE}/cpython-{PYTHON_VERSION}+{PYTHON_STANDALONE_VERSION}-{arch}-apple-darwin-install_only.tar.gz"
    else:  # linux
        return f"{PYTHON_STANDALONE_BASE}/cpython-{PYTHON_VERSION}+{PYTHON_STANDALONE_VERSION}-x86_64-unknown-linux-gnu-install_only.tar.gz"


def download_python_runtime(target_platform: str, dist_dir: Path) -> Path:
    """Download and extract Python runtime for the target platform."""
    python_dir = dist_dir / "python"
    if python_dir.exists():
        print(f"  Python runtime already exists at {python_dir}")
        return python_dir

    url = get_python_standalone_url(target_platform)
    filename = url.split("/")[-1]
    download_path = dist_dir / filename

    print(f"  Downloading Python runtime from {url}...")
    urlretrieve(url, download_path)

    print(f"  Extracting to {python_dir}...")

    if filename.endswith(".zip"):
        # Windows embeddable package - extract directly
        python_dir.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(download_path, "r") as zf:
            zf.extractall(python_dir)
    else:
        # tar.gz from python-build-standalone - extracts to python/ subfolder
        with tarfile.open(download_path, "r:gz") as tf:
            tf.extractall(dist_dir)
        # python-build-standalone extracts to 'python/' already

    download_path.unlink()  # Clean up download
    return python_dir


def build_workspace_wheels(repo_root: Path, wheel_dir: Path) -> list[Path]:
    """Build wheel files for all workspace packages using uv."""
    print("Building workspace wheels...")
    wheel_dir.mkdir(parents=True, exist_ok=True)

    wheels = []
    for pkg_path in WORKSPACE_PACKAGES:
        pkg_dir = repo_root / pkg_path
        if not pkg_dir.exists():
            print(f"  Skipping {pkg_path} (not found)")
            continue

        print(f"  Building {pkg_path}...")

        # Use uv to build the wheel
        result = subprocess.run(
            ["uv", "build", "--wheel", "--out-dir", str(wheel_dir)],
            cwd=pkg_dir,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            print(f"  ERROR building {pkg_path}:")
            print(result.stderr)
            raise RuntimeError(f"Failed to build {pkg_path}")

        # Find the built wheel
        pkg_name = pkg_path.split("/")[-1].replace("-", "_")
        for whl in wheel_dir.glob(f"*{pkg_name}*.whl"):
            if whl not in wheels:
                wheels.append(whl)
                print(f"    Created: {whl.name}")

    return wheels


def build_shiv_archive(
    service: dict,
    repo_root: Path,
    dist_dir: Path,
    wheel_dir: Path,
) -> Path:
    """Build a shiv archive for a service using pre-built wheels."""
    name = service["name"]
    entry_point = service["entry_point"]
    output_path = dist_dir / "services" / f"{name}.pyz"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"  Building {name}.pyz...")

    # Find all wheels and the service wheel
    all_wheels = list(wheel_dir.glob("*.whl"))

    # Build shiv command with all workspace wheels
    cmd = [
        sys.executable,
        "-m",
        "shiv",
        "-c", entry_point,
        "-o", str(output_path),
        "--reproducible",
    ]

    # Add all wheels as dependencies
    for whl in all_wheels:
        cmd.append(str(whl))

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ERROR building {name}:")
        print(result.stderr)
        print(result.stdout)
        raise RuntimeError(f"Failed to build {name}")

    size_mb = output_path.stat().st_size / 1024 / 1024
    print(f"    Created {output_path.name} ({size_mb:.1f} MB)")
    return output_path


def ensure_tools_installed():
    """Ensure required tools are installed."""
    # Check for uv
    result = subprocess.run(["uv", "--version"], capture_output=True)
    if result.returncode != 0:
        print("ERROR: uv is not installed. Install with: pip install uv")
        sys.exit(1)

    # Ensure shiv is installed
    try:
        import shiv  # noqa: F401
    except ImportError:
        print("Installing shiv...")
        subprocess.run([sys.executable, "-m", "pip", "install", "shiv"], check=True)


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
    parser.add_argument(
        "--skip-python",
        action="store_true",
        help="Skip downloading Python runtime (use system Python)",
    )
    parser.add_argument(
        "--skip-wheels",
        action="store_true",
        help="Skip building wheels (reuse existing)",
    )
    args = parser.parse_args()

    repo_root = get_repo_root()
    dist_dir = get_dist_dir()
    wheel_dir = dist_dir / "wheels"

    print(f"Repository root: {repo_root}")
    print(f"Output directory: {dist_dir}")
    print(f"Target platform: {args.platform}")
    print()

    # Ensure tools are available
    ensure_tools_installed()

    # Clean previous build (but keep wheels if --skip-wheels)
    if dist_dir.exists() and not args.skip_wheels:
        print("Cleaning previous build...")
        shutil.rmtree(dist_dir)
    elif dist_dir.exists():
        # Keep wheels, clean services and python
        for subdir in ["services", "python"]:
            path = dist_dir / subdir
            if path.exists():
                shutil.rmtree(path)

    dist_dir.mkdir(parents=True, exist_ok=True)

    # Build workspace wheels
    if not args.skip_wheels or not wheel_dir.exists():
        print("\n" + "=" * 50)
        build_workspace_wheels(repo_root, wheel_dir)

    # Build service archives
    print("\n" + "=" * 50)
    print("Building service archives...")
    for service in SERVICES:
        build_shiv_archive(service, repo_root, dist_dir, wheel_dir)

    # Download Python runtime
    if not args.skip_python:
        print("\n" + "=" * 50)
        print(f"Downloading Python {PYTHON_VERSION} runtime...")
        download_python_runtime(args.platform, dist_dir)
    else:
        print("\nSkipping Python runtime download (--skip-python)")

    print("\n" + "=" * 50)
    print("Build complete!")
    print(f"Output directory: {dist_dir}")
    print("\nContents:")
    for item in sorted(dist_dir.rglob("*")):
        if item.is_file() and "wheels" not in str(item):
            rel_path = item.relative_to(dist_dir)
            size_mb = item.stat().st_size / 1024 / 1024
            print(f"  {rel_path} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
