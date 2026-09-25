# CivicMind Frontend Location Integration

Use this flow when the citizen selects or captures an issue photo:

1. Request the browser's current position.
2. Center Google Maps on the returned coordinates.
3. Display a draggable marker so the citizen can correct the issue location.
4. Submit the confirmed coordinates and accuracy with the image.
5. If permission is denied or GPS times out, require the citizen to place the marker manually.

Google Maps displays and corrects the location. Browser geolocation obtains the device's GPS position.

## Browser location helper

```ts
export type IssueLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  source: "gps" | "manual";
};

export function getIssueLocation(): Promise<IssueLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyMeters: coords.accuracy,
          source: "gps",
        }),
      reject,
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  });
}
```

Call `getIssueLocation()` immediately after a user selects a photo. This must happen from a user action so the browser can show its permission prompt.

## Submit to the backend

```ts
const body = new FormData();
body.append("image", photo);
body.append("description", description);
body.append("latitude", String(location.latitude));
body.append("longitude", String(location.longitude));
body.append("location_source", location.source);

if (location.accuracyMeters !== undefined) {
  body.append("location_accuracy_meters", String(location.accuracyMeters));
}

const response = await fetch(`${API_URL}/api/issues`, {
  method: "POST",
  body,
});
```

Do not use `watchPosition()`: CivicMind only needs the problem location at submission time, not continuous citizen tracking.

## Google Cloud setup

Enable Maps JavaScript API and Geocoding API. Use two restricted keys:

- Frontend key: restrict by website origin and allow only Maps JavaScript API.
- Backend key: keep in `backend/.env` as `GOOGLE_MAPS_API_KEY` and allow only Geocoding API.

Never commit either real key. For local development, add the frontend key to the frontend's ignored environment file.
