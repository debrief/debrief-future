from __future__ import annotations

import re
import sys
from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum
from typing import Any, ClassVar, Literal, Optional, Union

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    RootModel,
    SerializationInfo,
    SerializerFunctionWrapHandler,
    field_validator,
    model_serializer,
)


metamodel_version = "None"
version = "None"


class ConfiguredBaseModel(BaseModel):
    model_config = ConfigDict(
        serialize_by_alias=True,
        validate_by_name=True,
        validate_assignment=True,
        validate_default=True,
        extra="forbid",
        arbitrary_types_allowed=True,
        use_enum_values=True,
        strict=False,
    )

    @model_serializer(mode="wrap", when_used="unless-none")
    def treat_empty_lists_as_none(
        self, handler: SerializerFunctionWrapHandler, info: SerializationInfo
    ) -> dict[str, Any]:
        if info.exclude_none:
            _instance = self.model_copy()
            for field, field_info in type(_instance).model_fields.items():
                if getattr(_instance, field) == [] and not (field_info.is_required()):
                    setattr(_instance, field, None)
        else:
            _instance = self
        return handler(_instance, info)


class LinkMLMeta(RootModel):
    root: dict[str, Any] = {}
    model_config = ConfigDict(frozen=True)

    def __getattr__(self, key: str):
        return getattr(self.root, key)

    def __getitem__(self, key: str):
        return self.root[key]

    def __setitem__(self, key: str, value):
        self.root[key] = value

    def __contains__(self, key: str) -> bool:
        return key in self.root


linkml_meta = LinkMLMeta(
    {
        "default_prefix": "debrief",
        "default_range": "string",
        "description": "LinkML schemas for Debrief v4.x maritime tactical analysis "
        "platform. Defines GeoJSON profile extensions for tracks, "
        "sensor contacts, and reference locations, plus STAC metadata "
        "and tool definitions.",
        "id": "https://debrief.info/schemas/debrief",
        "imports": ["linkml:types"],
        "name": "debrief",
        "prefixes": {
            "debrief": {
                "prefix_prefix": "debrief",
                "prefix_reference": "https://debrief.info/schemas/",
            },
            "geojson": {
                "prefix_prefix": "geojson",
                "prefix_reference": "https://purl.org/geojson/vocab#",
            },
            "linkml": {"prefix_prefix": "linkml", "prefix_reference": "https://w3id.org/linkml/"},
            "stac": {
                "prefix_prefix": "stac",
                "prefix_reference": "https://stac-extensions.github.io/",
            },
        },
        "source_file": "/home/user/debrief-future/shared/schemas/src/linkml/debrief.yaml",
        "title": "Debrief Maritime Analysis Schemas",
    }
)


class DebriefEntity(ConfiguredBaseModel):
    """
    Base class for all Debrief entities
    """

    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta(
        {"abstract": True, "from_schema": "https://debrief.info/schemas/debrief"}
    )

    id: str = Field(
        default=...,
        description="""Unique identifier""",
        json_schema_extra={"linkml_meta": {"domain_of": ["DebriefEntity"]}},
    )


# Model rebuild
# see https://pydantic-docs.helpmanual.io/usage/models/#rebuilding-a-model
DebriefEntity.model_rebuild()
