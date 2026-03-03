#!/bin/sh
set -e

# ensure storage directories exist and are owned by the application user
mkdir -p /app/storage/uploads /app/storage/outputs /app/storage/temp
chown -R appuser:appuser /app/storage

# drop privileges if running as root and then exec the command as appuser
if [ "$(id -u)" -eq 0 ]; then
    # `su` should be present in the base image
    exec su appuser -c "$*"
else
    exec "$@"
fi
