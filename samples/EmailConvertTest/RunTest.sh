#!/usr/bin/env bash
set -euo pipefail
JAVA_CMD=(java)
if [[ $(uname -s) == Linux ]]; then
    export LC_ALL="${EMAIL_TEST_LOCALE:-C.UTF-8}"
    JAVA_BIN=$(readlink -f -- "$(command -v java)")
    JAVA_LIB_DIR="$(dirname -- "$JAVA_BIN")/../lib"
    JSIG=
    # Match libjsig to the Java on PATH, including JDK 8's architecture subdirectory.
    for candidate in "$JAVA_LIB_DIR/libjsig.so" "$JAVA_LIB_DIR"/*/libjsig.so; do
        if [[ -f "$candidate" ]]; then
            JSIG=$(readlink -f -- "$candidate")
            break
        fi
    done
    if [[ -z "$JSIG" ]]; then
        echo "Error: libjsig.so not found for Java: $JAVA_BIN" >&2
        exit 1
    fi
    # Preload only for the sample JVM and preserve any existing preloads.
    JAVA_CMD=(env "LD_PRELOAD=$JSIG${LD_PRELOAD:+:$LD_PRELOAD}" "$JAVA_BIN")
fi
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
SAMPLES=$(cd -- "$HERE/.." && pwd)
JAR="$SAMPLES/lib/${JAR_NAME:-generation-1.3.0.jar}"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/classes"
javac -encoding UTF-8 -cp "$JAR" -d "$WORK/classes" "$HERE/EmailConvertTest.java"
cd "$SAMPLES"
"${JAVA_CMD[@]}" -Xcheck:jni -Dfile.encoding=UTF-8 -cp "$WORK/classes:$JAR" EmailConvertTest
