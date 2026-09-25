import pytest

from app.services import distance_meters, validate_location


def test_distance_for_same_point_is_zero() -> None:
    assert distance_meters(17.385, 78.4867, 17.385, 78.4867) == 0


def test_nearby_points_are_within_duplicate_radius() -> None:
    distance = distance_meters(17.3850, 78.4867, 17.3855, 78.4867)
    assert 50 < distance < 60


@pytest.mark.parametrize(
    ("latitude", "longitude", "accuracy", "source"),
    [(91, 0, 5, "gps"), (0, 181, 5, "gps"), (0, 0, -1, "gps"), (0, 0, 5, "wifi")],
)
def test_invalid_location_is_rejected(
    latitude: float,
    longitude: float,
    accuracy: float,
    source: str,
) -> None:
    with pytest.raises(ValueError):
        validate_location(latitude, longitude, accuracy, source)
