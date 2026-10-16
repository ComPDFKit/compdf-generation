#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
SAMPLES=$(cd -- "$HERE/.." && pwd)
ROOT=$(cd -- "$SAMPLES/.." && pwd)
JAR="$SAMPLES/lib/${JAR_NAME:-generation-1.3.0.jar}"
case $(uname -s) in
  Linux) export LC_ALL="${EMAIL_TEST_LOCALE:-C.UTF-8}"; NATIVE="$ROOT/generation/src/main/resources/libs/linux/libpdfgeneration.so" ;;
  Darwin) NATIVE="$ROOT/generation/src/main/resources/libs/mac/libpdfgeneration.dylib" ;;
  *) echo 'Run this test on Linux or macOS with a rebuilt native library.' >&2; exit 1 ;;
esac
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/classes"
javac -encoding UTF-8 -cp "$JAR" -d "$WORK/classes" "$HERE/EmailConvertTest.java" "$HERE/EmailApiContractTest.java"
cd "$WORK"
# Separate JVMs prove that HTML-only conversion needs no initialized license.
for mode in unlicensed licensed; do
  java -Xcheck:jni -Dfile.encoding=UTF-8 -cp "$WORK/classes:$JAR" EmailApiContractTest "$mode" "$SAMPLES" "$NATIVE"
done
