"""Config file storage with atomic writes and file locking.

Provides safe concurrent access to the config file using:
1. File locking to prevent simultaneous writes
2. Atomic writes via temp file + rename to prevent corruption
"""

import json
import logging

from filelock import FileLock, Timeout

from .models import Config
from .paths import get_config_file, get_lock_file

logger = logging.getLogger(__name__)

# Lock timeout in seconds
LOCK_TIMEOUT = 5.0


def read_config() -> Config:
    """Read the configuration file.

    If the file doesn't exist, returns default config.
    If the file is corrupted, logs a warning and returns default config.

    Returns:
        Config object with current settings.
    """
    config_file = get_config_file(ensure_dir_exists=True)

    if not config_file.exists():
        logger.debug("Config file not found, using defaults")
        return Config.default()

    try:
        data = json.loads(config_file.read_text(encoding="utf-8"))
        return Config.model_validate(data)
    except json.JSONDecodeError as e:
        logger.warning(f"Config file corrupted (invalid JSON): {e}")
        return Config.default()
    except Exception as e:
        logger.warning(f"Config file validation failed: {e}")
        return Config.default()


def write_config(config: Config) -> None:
    """Write the configuration file atomically with locking.

    Uses a lock file to prevent concurrent writes, and writes to a
    temp file first then renames for atomic operation.

    Args:
        config: Config object to write.

    Raises:
        Timeout: If lock cannot be acquired within timeout.
    """
    config_file = get_config_file(ensure_dir_exists=True)
    lock_file = get_lock_file()

    lock = FileLock(lock_file, timeout=LOCK_TIMEOUT)

    try:
        with lock:
            # Write to temp file first
            temp_file = config_file.with_suffix(".tmp")

            # Serialize with aliases for camelCase field names
            json_data = config.model_dump(mode="json", by_alias=True)
            temp_file.write_text(
                json.dumps(json_data, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )

            # Atomic rename (POSIX) or replace (Windows)
            temp_file.replace(config_file)

            logger.debug(f"Config written to {config_file}")

    except Timeout:
        logger.error(f"Could not acquire lock on {lock_file}")
        raise


def update_config(updater: callable) -> Config:
    """Read, update, and write config atomically.

    Args:
        updater: Function that takes Config and returns modified Config.

    Returns:
        Updated Config object.
    """
    config_file = get_config_file(ensure_dir_exists=True)
    lock_file = get_lock_file()
    lock = FileLock(lock_file, timeout=LOCK_TIMEOUT)

    try:
        with lock:
            # Read current config
            config = read_config()
            updated = updater(config)

            # Write directly (don't call write_config to avoid nested lock)
            temp_file = config_file.with_suffix(".tmp")
            json_data = updated.model_dump(mode="json", by_alias=True)
            temp_file.write_text(
                json.dumps(json_data, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            temp_file.replace(config_file)
            logger.debug(f"Config updated in {config_file}")

            return updated
    except Timeout:
        logger.error(f"Could not acquire lock on {lock_file}")
        raise
