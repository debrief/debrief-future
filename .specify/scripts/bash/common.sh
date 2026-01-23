#!/usr/bin/env bash
# Common functions and variables for all scripts

# Get repository root, with fallback for non-git repositories
get_repo_root() {
    if git rev-parse --show-toplevel >/dev/null 2>&1; then
        git rev-parse --show-toplevel
    else
        # Fall back to script location for non-git repos
        local script_dir="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        (cd "$script_dir/../../.." && pwd)
    fi
}

# Get current branch, with fallback for non-git repositories
get_current_branch() {
    # First check if SPECIFY_FEATURE environment variable is set
    if [[ -n "${SPECIFY_FEATURE:-}" ]]; then
        echo "$SPECIFY_FEATURE"
        return
    fi

    # Then check git if available
    if git rev-parse --abbrev-ref HEAD >/dev/null 2>&1; then
        git rev-parse --abbrev-ref HEAD
        return
    fi

    # For non-git repos, try to find the latest feature directory
    local repo_root=$(get_repo_root)
    local specs_dir="$repo_root/specs"

    if [[ -d "$specs_dir" ]]; then
        local latest_feature=""
        local highest=0

        for dir in "$specs_dir"/*; do
            if [[ -d "$dir" ]]; then
                local dirname=$(basename "$dir")
                if [[ "$dirname" =~ ^([0-9]{3})- ]]; then
                    local number=${BASH_REMATCH[1]}
                    number=$((10#$number))
                    if [[ "$number" -gt "$highest" ]]; then
                        highest=$number
                        latest_feature=$dirname
                    fi
                fi
            fi
        done

        if [[ -n "$latest_feature" ]]; then
            echo "$latest_feature"
            return
        fi
    fi

    echo "main"  # Final fallback
}

# Check if we have git available
has_git() {
    git rev-parse --show-toplevel >/dev/null 2>&1
}

check_feature_branch() {
    local branch="$1"
    local has_git_repo="$2"

    # For non-git repos, we can't enforce branch naming but still provide output
    if [[ "$has_git_repo" != "true" ]]; then
        echo "[specify] Warning: Git repository not detected; skipped branch validation" >&2
        return 0
    fi

    if [[ ! "$branch" =~ ^[0-9]{3}- ]]; then
        echo "ERROR: Not on a feature branch. Current branch: $branch" >&2
        echo "Feature branches should be named like: 001-feature-name" >&2
        return 1
    fi

    return 0
}

get_feature_dir() { echo "$1/specs/$2"; }

# Find feature directory by numeric prefix instead of exact branch match
# This allows multiple branches to work on the same spec (e.g., 004-fix-bug, 004-add-feature)
find_feature_dir_by_prefix() {
    local repo_root="$1"
    local branch_name="$2"
    local specs_dir="$repo_root/specs"

    # Extract numeric prefix from branch (e.g., "004" from "004-whatever")
    if [[ ! "$branch_name" =~ ^([0-9]{3})- ]]; then
        # If branch doesn't have numeric prefix, fall back to exact match
        echo "$specs_dir/$branch_name"
        return
    fi

    local prefix="${BASH_REMATCH[1]}"

    # Search for directories in specs/ that start with this prefix
    local matches=()
    if [[ -d "$specs_dir" ]]; then
        for dir in "$specs_dir"/"$prefix"-*; do
            if [[ -d "$dir" ]]; then
                matches+=("$(basename "$dir")")
            fi
        done
    fi

    # Handle results
    if [[ ${#matches[@]} -eq 0 ]]; then
        # No match found - return the branch name path (will fail later with clear error)
        echo "$specs_dir/$branch_name"
    elif [[ ${#matches[@]} -eq 1 ]]; then
        # Exactly one match - perfect!
        echo "$specs_dir/${matches[0]}"
    else
        # Multiple matches - this shouldn't happen with proper naming convention
        echo "ERROR: Multiple spec directories found with prefix '$prefix': ${matches[*]}" >&2
        echo "Please ensure only one spec directory exists per numeric prefix." >&2
        echo "$specs_dir/$branch_name"  # Return something to avoid breaking the script
    fi
}

get_feature_paths() {
    local repo_root=$(get_repo_root)
    local current_branch=$(get_current_branch)
    local has_git_repo="false"

    if has_git; then
        has_git_repo="true"
    fi

    # Use prefix-based lookup to support multiple branches per spec
    local feature_dir=$(find_feature_dir_by_prefix "$repo_root" "$current_branch")

    cat <<EOF
REPO_ROOT='$repo_root'
CURRENT_BRANCH='$current_branch'
HAS_GIT='$has_git_repo'
FEATURE_DIR='$feature_dir'
FEATURE_SPEC='$feature_dir/spec.md'
IMPL_PLAN='$feature_dir/plan.md'
TASKS='$feature_dir/tasks.md'
RESEARCH='$feature_dir/research.md'
DATA_MODEL='$feature_dir/data-model.md'
QUICKSTART='$feature_dir/quickstart.md'
CONTRACTS_DIR='$feature_dir/contracts'
EOF
}

check_file() { [[ -f "$1" ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
check_dir() { [[ -d "$1" && -n $(ls -A "$1" 2>/dev/null) ]] && echo "  ✓ $2" || echo "  ✗ $2"; }

# =============================================================================
# WORKTREE SUPPORT
# =============================================================================
# Enables parallel Claude Code sessions via git worktrees.
#
# Detection priority:
#   1. SPECKIT_WORKTREES=true     → Force worktree mode
#   2. SPECKIT_WORKTREES=false    → Force branch mode (cloud default)
#   3. CLAUDE_CODE_SESSION_ID set → Cloud environment, use branch mode
#   4. ../worktrees/ exists       → Local setup detected, use worktree mode
#   5. Default                    → Branch mode (current behavior)
# =============================================================================

# Get the worktree base path (relative to repo root)
get_worktree_base() {
    local repo_root=$(get_repo_root)
    local parent_dir=$(dirname "$repo_root")
    echo "$parent_dir/worktrees"
}

# Check if worktree mode is enabled
# Returns 0 (true) if worktrees should be used, 1 (false) otherwise
is_worktree_mode() {
    # Explicit override via environment variable
    if [[ "${SPECKIT_WORKTREES:-}" == "true" ]]; then
        return 0
    fi
    if [[ "${SPECKIT_WORKTREES:-}" == "false" ]]; then
        return 1
    fi

    # Cloud environment detection (Claude Code sessions)
    if [[ -n "${CLAUDE_CODE_SESSION_ID:-}" ]]; then
        return 1  # Cloud: use branch checkout
    fi

    # Local detection: check if worktrees directory exists
    local worktree_base=$(get_worktree_base)
    if [[ -d "$worktree_base" ]]; then
        return 0  # Local parallel setup detected
    fi

    # Default: use traditional branch mode
    return 1
}

# Check if current directory is inside a git worktree (not the main repo)
is_in_worktree() {
    if ! has_git; then
        return 1
    fi
    local git_dir=$(git rev-parse --git-dir 2>/dev/null)
    # Worktrees have .git as a file pointing to the main repo, not a directory
    if [[ -f "$(get_repo_root)/.git" ]]; then
        return 0
    fi
    return 1
}

# Get the main repository root (even if we're in a worktree)
get_main_repo_root() {
    if ! has_git; then
        get_repo_root
        return
    fi

    # git worktree list shows all worktrees; the first is always the main one
    local main_worktree=$(git worktree list --porcelain 2>/dev/null | head -1 | sed 's/^worktree //')
    if [[ -n "$main_worktree" ]]; then
        echo "$main_worktree"
    else
        get_repo_root
    fi
}

# Create a new worktree for a branch
# Usage: create_worktree BRANCH_NAME
# Returns the worktree path on success, exits on failure
create_worktree() {
    local branch_name="$1"
    local worktree_base=$(get_worktree_base)
    local worktree_path="$worktree_base/$branch_name"

    # Ensure worktree base exists
    mkdir -p "$worktree_base"

    # Create the worktree
    if git worktree add "$worktree_path" -b "$branch_name" 2>/dev/null; then
        echo "$worktree_path"
        return 0
    else
        echo "ERROR: Failed to create worktree at $worktree_path" >&2
        return 1
    fi
}

# List active worktrees
list_worktrees() {
    if ! has_git; then
        echo "No git repository found" >&2
        return 1
    fi
    git worktree list
}

