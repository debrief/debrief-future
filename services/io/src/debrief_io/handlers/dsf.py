"""DSF (Debrief Sensor File) format handler.

Parses Debrief's DSF file format into GeoJSON features.
DSF files contain sensor contact lines in the same format as
REP file sensor annotations (;SENSOR: and ;SENSOR2: lines).
"""

from __future__ import annotations

import time
from typing import Any

from debrief_io.handlers.annotations.parser import is_annotation_line, parse_annotations
from debrief_io.handlers.base import BaseHandler
from debrief_io.models import ParseResult, ParseWarning


class DSFHandler(BaseHandler):
    """Handler for Debrief DSF (Sensor File) format.

    DSF files contain only ;SENSOR: and ;SENSOR2: lines.
    Delegates parsing to the existing REP annotation parser.
    """

    @property
    def name(self) -> str:
        return "Debrief DSF Format"

    @property
    def description(self) -> str:
        return "Handler for Debrief Sensor File format"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def extensions(self) -> list[str]:
        return [".dsf", ".DSF"]

    def parse(self, content: str, source_file: str) -> ParseResult:
        """Parse DSF sensor contact lines into GeoJSON features.

        DSF files contain only ;SENSOR: and ;SENSOR2: lines.
        Each line produces a GeoJSON feature via the existing
        annotation parser.
        """
        start = time.perf_counter()
        warnings: list[ParseWarning] = []
        features: list[dict[str, Any]] = []

        lines = content.splitlines()
        annotation_lines: list[tuple[int, str]] = []

        for line_num, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped:
                continue

            if is_annotation_line(stripped):
                annotation_lines.append((line_num, stripped))
            else:
                warnings.append(
                    ParseWarning(
                        message=f"Non-sensor line in DSF file: {stripped[:50]}",
                        line_number=line_num,
                        code="UNKNOWN_RECORD",
                    )
                )

        if annotation_lines:
            try:
                features = parse_annotations(annotation_lines, source_file)
            except Exception as e:
                warnings.append(
                    ParseWarning(
                        message=f"Annotation parse error: {e}",
                        code="PARSE_ERROR",
                    )
                )

        elapsed_ms = (time.perf_counter() - start) * 1000

        return ParseResult(
            features=features,
            warnings=warnings,
            source_file=source_file,
            parse_time_ms=elapsed_ms,
            handler=self.name,
        )
