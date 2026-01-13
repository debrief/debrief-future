#!/usr/bin/env python3
"""
Build Python services as shiv archives for bundling with Electron app.

This script:
1. Creates shiv archives for debrief-stac and debrief-io
2. Downloads Python embeddable runtime for the target platform
3. Outputs everything to packaging/dist/ ready for electron-builder

Usage:
    python packaging/build-services.py [--platform linux|darwin|win32]
"""

import argparse
import os
import platform
import shutil
import subprocess
import sys
import tarfile
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

# Services to build
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


def get_repo_root() -> Path:
    """Get the repository root directory."""
    return Path(__file__).parent.parent.parent.parent


def get_dist_dir() -> Path:
    """Get the dist directory for built artifacts."""
    return Path(__file__).parent / "dist"


def get_python_standalone_url(target_platform: str) -> str:
    """Get the URL for python-build-standalone for the target platform."""
    if target_platform == "win32":
        return PYTHON_EMBED_WIN
    elif target_platform == "darwin":
        # macOS - use universal2 build for both Intel and Apple Silicon
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
    python_dir.mkdir(parents=True, exist_ok=True)

    if filename.endswith(".zip"):
        # Windows embeddable package
        with zipfile.ZipFile(download_path, "r") as zf:
            zf.extractall(python_dir)
    else:
        # tar.gz from python-build-standalone
        with tarfile.open(download_path, "r:gz") as tf:
            tf.extractall(dist_dir)
        # python-build-standalone extracts to python/
        # Already in the right place

    download_path.unlink()  # Clean up download
    return python_dir


def build_shiv_archive(service: dict, repo_root: Path, dist_dir: Path) -> Path:
    """Build a shiv archive for a service."""
    name = service["name"]
    service_path = repo_root / service["path"]
    entry_point = service["entry_point"]
    output_path = dist_dir / "services" / f"{name}.pyz"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"  Building {name}.pyz...")

    # Build the shiv archive
    # We need to install the service and its dependencies into the archive
    cmd = [
        sys.executable,
        "-m",
        "shiv",
        "-c", entry_point,
        "-o", str(output_path),
        "--reproducible",
        str(service_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ERROR building {name}:")
        print(result.stderr)
        raise RuntimeError(f"Failed to build {name}")

    print(f"  Created {output_path} ({output_path.stat().st_size / 1024 / 1024:.1f} MB)")
    return output_path


def ensure_shiv_installed():
    """Ensure shiv is installed."""
    try:
        import shiv
    except ImportError:
        print("Installing shiv...")
        subprocess.run([sys.executable, "-m", "pip", "install", "shiv"], check=True)


def main():
    parser = argparse.ArgumentParser(description="Build Python services for Electron bundling")
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
    args = parser.parse_args()

    repo_root = get_repo_root()
    dist_dir = get_dist_dir()

    print(f"Repository root: {repo_root}")
    print(f"Output directory: {dist_dir}")
    print(f"Target platform: {args.platform}")
    print()

    # Clean previous build
    if dist_dir.exists():
        print("Cleaning previous build...")
        shutil.rmtree(dist_dir)
    dist_dir.mkdir(parents=True)

    # Ensure shiv is installed
    ensure_shiv_installed()

    # Build service archives
    print("\nBuilding service archives...")
    for service in SERVICES:
        build_shiv_archive(service, repo_root, dist_dir)

    # Download Python runtime
    if not args.skip_python:
        print(f"\nDownloading Python {PYTHON_VERSION} runtime...")
        download_python_runtime(args.platform, dist_dir)
    else:
        print("\nSkipping Python runtime download (--skip-python)")

    print("\nBuild complete!")
    print(f"Output directory: {dist_dir}")
    print("\nContents:")
    for item in dist_dir.rglob("*"):
        if item.is_file():
            rel_path = item.relative_to(dist_dir)
            size_mb = item.stat().st_size / 1024 / 1024
            print(f"  {rel_path} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
