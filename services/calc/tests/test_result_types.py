"""Tests for ResultTopType and ResultTypePath."""

import pytest
from debrief_calc.result_types import ResultTopType, ResultTypePath


class TestResultTopType:
    def test_enum_values(self):
        assert ResultTopType.MUTATION == "mutation"
        assert ResultTopType.ADDITION == "addition"
        assert ResultTopType.DELETION == "deletion"
        assert ResultTopType.ARTIFACT == "artifact"

    def test_enum_has_four_members(self):
        assert len(ResultTopType) == 4

    def test_string_conversion(self):
        # StrEnum: str() returns the value directly
        assert str(ResultTopType.MUTATION) == "mutation"
        assert ResultTopType.MUTATION.value == "mutation"


class TestResultTypePath:
    def test_simple_path(self):
        p = ResultTypePath("mutation")
        assert p.path == "mutation"
        assert p.top_level == ResultTopType.MUTATION
        assert p.segments == ["mutation"]

    def test_multi_segment_path(self):
        p = ResultTypePath("mutation/track/smoothed")
        assert p.path == "mutation/track/smoothed"
        assert p.top_level == ResultTopType.MUTATION
        assert p.segments == ["mutation", "track", "smoothed"]

    def test_all_top_level_types(self):
        for t in ResultTopType:
            p = ResultTypePath(t.value)
            assert p.top_level == t

    def test_invalid_top_level(self):
        with pytest.raises(ValueError, match="first segment must be a valid ResultTopType"):
            ResultTypePath("unknown/something")

    def test_empty_path(self):
        with pytest.raises(ValueError, match="non-empty string"):
            ResultTypePath("")

    def test_leading_slash(self):
        with pytest.raises(ValueError, match="leading or trailing"):
            ResultTypePath("/mutation/track")

    def test_trailing_slash(self):
        with pytest.raises(ValueError, match="leading or trailing"):
            ResultTypePath("mutation/track/")

    def test_empty_segment(self):
        with pytest.raises(ValueError, match="empty segments"):
            ResultTypePath("mutation//track")

    def test_matches_exact(self):
        p = ResultTypePath("mutation/track/smoothed")
        assert p.matches("mutation/track/smoothed") is True

    def test_matches_prefix(self):
        p = ResultTypePath("mutation/track/smoothed")
        assert p.matches("mutation") is True
        assert p.matches("mutation/track") is True

    def test_matches_wrong_prefix(self):
        p = ResultTypePath("mutation/track/smoothed")
        assert p.matches("addition") is False
        assert p.matches("mutation/sensor") is False

    def test_matches_partial_segment_no_match(self):
        p = ResultTypePath("mutation/track/smoothed")
        assert p.matches("mut") is False

    def test_matches_empty_prefix(self):
        p = ResultTypePath("mutation")
        assert p.matches("") is False

    def test_matches_longer_prefix(self):
        p = ResultTypePath("mutation")
        assert p.matches("mutation/track") is False

    def test_equality(self):
        a = ResultTypePath("mutation/track/smoothed")
        b = ResultTypePath("mutation/track/smoothed")
        assert a == b

    def test_inequality(self):
        a = ResultTypePath("mutation/track/smoothed")
        b = ResultTypePath("mutation/track/interpolated")
        assert a != b

    def test_hash(self):
        a = ResultTypePath("mutation/track/smoothed")
        b = ResultTypePath("mutation/track/smoothed")
        assert hash(a) == hash(b)

    def test_repr(self):
        p = ResultTypePath("artifact/image/bt_plot")
        assert repr(p) == "ResultTypePath('artifact/image/bt_plot')"

    def test_str(self):
        p = ResultTypePath("artifact/image/bt_plot")
        assert str(p) == "artifact/image/bt_plot"
