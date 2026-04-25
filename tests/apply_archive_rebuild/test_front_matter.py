"""Unit tests for `parse_front_matter` (T011)."""

from __future__ import annotations

import datetime as _dt
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from types import ModuleType


def test_archive_shape_parses(aar: ModuleType) -> None:
    text = """---
layout: future-post
title: "Building Alpha"
date: 2026-03-01
author: Ian
track: credibility
tags:
  - tracer-bullet
  - alpha
excerpt: "Short."
---

Body content.
"""
    fm, body = aar.parse_front_matter(text)
    assert fm.layout == "future-post"
    assert fm.title == "Building Alpha"
    assert fm.date == _dt.date(2026, 3, 1)
    assert fm.author == "Ian"
    assert fm.track == "credibility"
    assert fm.tags == ["tracer-bullet", "alpha"]
    assert fm.excerpt == "Short."
    assert fm.reading_time is None
    assert fm.permalink is None
    assert body.startswith("Body content.")


def test_site_shape_with_reading_time(aar: ModuleType) -> None:
    text = """---
layout: future-post
title: "Building Beta"
date: 2026-03-10
author: Ian
track: credibility
tags: [beta]
reading_time: 3
---
"""
    fm, _body = aar.parse_front_matter(text)
    assert fm.reading_time == 3


def test_site_shape_with_permalink(aar: ModuleType) -> None:
    text = """---
layout: future-post
title: "Custom"
date: 2026-03-11
author: Ian
track: credibility
tags: []
permalink: /future/custom-slug/
---
"""
    fm, _body = aar.parse_front_matter(text)
    assert fm.permalink == "/future/custom-slug/"


def test_unknown_field_packed_into_extra(aar: ModuleType) -> None:
    text = """---
layout: future-post
title: "Has extras"
date: 2026-03-15
author: Ian
track: credibility
tags: []
custom_field: hello
another: 42
---
"""
    fm, _body = aar.parse_front_matter(text)
    assert fm.extra == {"custom_field": "hello", "another": 42}


def test_malformed_yaml_raises(aar: ModuleType) -> None:
    text = """---
layout: future-post
title: "Broken
date: 2026-03-15
---
"""
    with pytest.raises(aar.FrontMatterError):
        aar.parse_front_matter(text)
