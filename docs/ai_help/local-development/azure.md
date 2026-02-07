# Azure Local Emulators

> **Purpose**: Run Azure services locally for testing.

---

## Azurite (Official Storage Emulator) ⭐

Microsoft's official emulator for Blob, Queue, and Table storage:

```bash
# Install
npm install -g azurite

# Run all services
azurite --silent --location ./azurite-data --debug ./azurite-debug.log

# Or specific services
azurite-blob --blobPort 10000
azurite-queue --queuePort 10001
azurite-table --tablePort 10002
```

```bash
# Docker
docker run -d -p 10000:10000 -p 10001:10001 -p 10002:10002 \
  mcr.microsoft.com/azure-storage/azurite
```

---

## Connection String for Azurite

```typescript
const connectionString = 'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;';

import { BlobServiceClient } from '@azure/storage-blob';
const blobService = BlobServiceClient.fromConnectionString(connectionString);
```

---

## Azure Functions Core Tools

Run Azure Functions locally:

```bash
# Install
npm install -g azure-functions-core-tools@4

# Create and run
func init MyFunctionApp --worker-runtime node
func new --name MyHttpTrigger --template "HTTP trigger"
func start
```

---

## Azure Cosmos DB Emulator

```bash
# Docker (Linux)
docker run -d -p 8081:8081 -p 10251-10254:10251-10254 \
  mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator

# Windows has native installer
```

```typescript
const cosmosClient = new CosmosClient({
  endpoint: 'https://localhost:8081',
  key: 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==', // Default emulator key
});
```

---

## Azure Service Bus Emulator (Preview)

```bash
# Docker Compose (requires SQL Server)
# See: https://github.com/Azure/azure-service-bus-emulator
docker-compose up -d
```

---

## Azure Event Hubs Emulator (Preview)

```bash
# See: https://github.com/Azure/azure-event-hubs-emulator
docker-compose up -d
```
