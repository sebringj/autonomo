# Analytics

> **Purpose**: Self-hosted analytics for testing without cloud services.

---

## PostHog (Self-Hosted)

```bash
docker run -d -p 8000:8000 posthog/posthog
```

Access at `http://localhost:8000`

```typescript
import posthog from 'posthog-js';

posthog.init('local-key', {
  api_host: 'http://localhost:8000'
});
```

---

## Plausible (Self-Hosted)

```bash
# Using their docker-compose.yml
docker-compose up -d
```

See [plausible/hosting](https://github.com/plausible/hosting) for setup.

---

## Mixpanel (Dev Mode)

Mixpanel allows development projects with no data limits in dev mode.

---

## Mock Analytics

For testing without running analytics:

```typescript
autonomoRegisterCustomAction('mockTrack', async (event) => {
  console.log('[Analytics]', event);
  return { tracked: true };
});
```
