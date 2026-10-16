#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
SAMPLES=$(cd -- "$HERE/.." && pwd)
JAR="$SAMPLES/lib/${JAR_NAME:-generation-1.3.0.jar}"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/classes"
javac -encoding UTF-8 -cp "$JAR" -d "$WORK/classes" "$HERE/FamilyHeaderFooterTest.java"
cd "$SAMPLES"
java -Dfile.encoding=UTF-8 -cp "$WORK/classes:$JAR" FamilyHeaderFooterTest
