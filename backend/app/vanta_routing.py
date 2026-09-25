from dataclasses import dataclass
from functools import lru_cache

import httpx

from .config import get_settings
from .services import distance_meters


Coordinate = tuple[float, float]  # (latitude, longitude)


@dataclass(frozen=True)
class MatrixResult:
    distances_meters: list[list[int]]
    durations_seconds: list[list[int]]
    source: str


def _fallback_matrix(coordinates: tuple[Coordinate, ...]) -> MatrixResult:
    distances: list[list[int]] = []
    durations: list[list[int]] = []
    for origin in coordinates:
        distance_row: list[int] = []
        duration_row: list[int] = []
        for destination in coordinates:
            direct_distance = distance_meters(*origin, *destination)
            road_distance = int(round(direct_distance * 1.25))
            distance_row.append(road_distance)
            # Conservative city average of 25 km/h, with a 1-minute minimum.
            duration_row.append(0 if road_distance == 0 else max(60, int(round(road_distance / 6.944))))
        distances.append(distance_row)
        durations.append(duration_row)
    return MatrixResult(distances, durations, "haversine_fallback")


@lru_cache(maxsize=64)
def get_matrix(coordinates: tuple[Coordinate, ...]) -> MatrixResult:
    settings = get_settings()
    if not settings.openrouteservice_api_key:
        return _fallback_matrix(coordinates)

    locations = [[longitude, latitude] for latitude, longitude in coordinates]
    try:
        response = httpx.post(
            f"{settings.openrouteservice_base_url.rstrip('/')}/v2/matrix/driving-car",
            headers={"Authorization": settings.openrouteservice_api_key},
            json={"locations": locations, "metrics": ["distance", "duration"]},
            timeout=12,
        )
        response.raise_for_status()
        payload = response.json()
        distances = [[int(round(value or 0)) for value in row] for row in payload["distances"]]
        durations = [[int(round(value or 0)) for value in row] for row in payload["durations"]]
        return MatrixResult(distances, durations, "openrouteservice")
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return _fallback_matrix(coordinates)


def get_route_geometry(coordinates: list[Coordinate]) -> tuple[list[list[float]], str]:
    if len(coordinates) < 2:
        return ([[coordinates[0][1], coordinates[0][0]]] if coordinates else []), "haversine_fallback"

    settings = get_settings()
    fallback = [[longitude, latitude] for latitude, longitude in coordinates]
    if not settings.openrouteservice_api_key:
        return fallback, "haversine_fallback"

    try:
        response = httpx.post(
            f"{settings.openrouteservice_base_url.rstrip('/')}/v2/directions/driving-car/geojson",
            headers={"Authorization": settings.openrouteservice_api_key},
            json={"coordinates": fallback},
            timeout=12,
        )
        response.raise_for_status()
        payload = response.json()
        geometry = payload["features"][0]["geometry"]["coordinates"]
        return geometry, "openrouteservice"
    except (httpx.HTTPError, IndexError, KeyError, TypeError, ValueError):
        return fallback, "haversine_fallback"
