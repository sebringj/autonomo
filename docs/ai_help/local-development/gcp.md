# Google Cloud Local Emulators

> **Purpose**: Run GCP services locally for testing.

---

## Cloud SDK Emulators

GCP provides official emulators via `gcloud`:

```bash
# Install emulators
gcloud components install cloud-datastore-emulator
gcloud components install pubsub-emulator
gcloud components install bigtable-emulator
gcloud components install cloud-firestore-emulator
```

---

## Datastore Emulator

```bash
gcloud beta emulators datastore start --project=test-project

# Set environment for SDK
$(gcloud beta emulators datastore env-init)
```

---

## Pub/Sub Emulator

```bash
gcloud beta emulators pubsub start --project=test-project

# Set environment
$(gcloud beta emulators pubsub env-init)
```

---

## Firestore Emulator

```bash
gcloud beta emulators firestore start --project=test-project
```

---

## Cloud Spanner Emulator

```bash
docker run -d -p 9010:9010 -p 9020:9020 \
  gcr.io/cloud-spanner-emulator/emulator
```

---

## Quick Reference

| Service | Port | Command |
|---------|------|---------|
| Datastore | 8081 | `gcloud beta emulators datastore start` |
| Pub/Sub | 8085 | `gcloud beta emulators pubsub start` |
| Firestore | 8080 | `gcloud beta emulators firestore start` |
| Bigtable | 8086 | `gcloud beta emulators bigtable start` |
| Spanner | 9010 | Docker container |
