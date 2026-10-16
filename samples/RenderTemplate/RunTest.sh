#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
SAMPLES=$(cd -- "$HERE/.." && pwd)
JAR="$SAMPLES/lib/${JAR_NAME:-generation-1.1.0.jar}"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$SAMPLES/out" "$WORK/classes"
javac -encoding UTF-8 -cp "$JAR" -d "$WORK/classes" "$HERE"/*.java
# The native loader extracts into the working directory; isolate each run.
cd "$WORK"
java -Dfile.encoding=UTF-8 -cp "$WORK/classes:$JAR" RenderTemplate "$SAMPLES"
