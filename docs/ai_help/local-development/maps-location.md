# Maps & Location

> **Purpose**: Mock GPS coordinates for location-based testing.

---

## Google Maps (No Emulator Needed)

Use API keys with localhost allowed in the console.

---

## Mapbox

Generous free tier works in development.

---

## Mock Location (React Native)

```typescript
import * as Location from 'expo-location';

// Custom action to set mock location
autonomoRegisterCustomAction('setLocation', async (coords) => {
  const { latitude, longitude } = JSON.parse(coords);
  // Expo Location supports mock locations in dev
  await Location.setMockLocationAsync({ latitude, longitude });
});
```

**Usage**:
```
autonomo_send_command(
  bridge="myapp", 
  action="custom", 
  target="setLocation", 
  value='{"latitude":37.7749,"longitude":-122.4194}'
)
```

---

## Common Test Coordinates

| Location | Latitude | Longitude |
|----------|----------|-----------|
| San Francisco | 37.7749 | -122.4194 |
| New York | 40.7128 | -74.0060 |
| London | 51.5074 | -0.1278 |
| Tokyo | 35.6762 | 139.6503 |
