# Debrief v4.x Build System
#
# Usage:
#   make build-loader    Build the Loader app with bundled Python services
#   make build-services  Build just the Python service archives
#   make clean           Clean all build artifacts

.PHONY: build-loader build-services build-loader-win build-loader-mac build-loader-linux clean help

# Default target
help:
	@echo "Debrief Build Commands:"
	@echo ""
	@echo "  make build-loader       Build Loader app for current platform"
	@echo "  make build-loader-win   Build Loader app for Windows"
	@echo "  make build-loader-mac   Build Loader app for macOS"
	@echo "  make build-loader-linux Build Loader app for Linux"
	@echo "  make build-services     Build Python service archives only"
	@echo "  make clean              Clean all build artifacts"
	@echo ""
	@echo "Prerequisites:"
	@echo "  - Python 3.11+ with uv installed"
	@echo "  - Node.js 18+ with pnpm installed"

# Build Python service archives (called by Loader build)
build-services:
	@echo "Building Python services..."
	cd apps/loader && python packaging/build-services.py

# Build Loader app for current platform
build-loader:
	@echo "Building Loader app..."
	cd apps/loader && pnpm install && pnpm build

# Platform-specific builds
build-loader-win:
	@echo "Building Loader app for Windows..."
	cd apps/loader && pnpm install && pnpm build:win

build-loader-mac:
	@echo "Building Loader app for macOS..."
	cd apps/loader && pnpm install && pnpm build:mac

build-loader-linux:
	@echo "Building Loader app for Linux..."
	cd apps/loader && pnpm install && pnpm build:linux

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf apps/loader/dist
	rm -rf apps/loader/release
	rm -rf apps/loader/packaging/dist
	rm -rf apps/loader/packaging/build
	rm -rf apps/loader/node_modules/.vite
	@echo "Clean complete."
