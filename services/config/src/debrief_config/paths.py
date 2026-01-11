"""Platform-specific path resolution for debrief-config.

Uses platformdirs for XDG Base Directory Specification compliance on Linux,
Application Support on macOS, and AppData on Windows.
"""

from pathlib import Path

from platformdirs import user_config_path

APP_NAME = "debrief"
CONFIG_FILENAME = "config.json"


def get_config_dir(ensure_exists: bool = True) -> Path:
    """Get the platform-specific configuration directory.

    On Linux: ~/.config/debrief or $XDG_CONFIG_HOME/debrief
    On macOS: ~/Library/Application Support/debrief
    On Windows: %APPDATA%\\debrief

    Args:
        ensure_exists: If True, create the directory if it doesn't exist.

    Returns:
        Path to the configuration directory.
    """
    config_dir = user_config_path(appname=APP_NAME, ensure_exists=ensure_exists)
    return config_dir


def get_config_file(ensure_dir_exists: bool = True) -> Path:
    """Get the path to the configuration file.

    Args:
        ensure_dir_exists: If True, create the directory if it doesn't exist.

    Returns:
        Path to config.json.
    """
    return get_config_dir(ensure_exists=ensure_dir_exists) / CONFIG_FILENAME


def get_lock_file() -> Path:
    """Get the path to the lock file for atomic writes.

    Returns:
        Path to config.json.lock.
    """
    return get_config_file(ensure_dir_exists=True).with_suffix(".lock")
