# AWS Local Emulators

> **Purpose**: Run AWS services locally for testing.

---

## LocalStack (Comprehensive) ⭐

LocalStack emulates 80+ AWS services locally — **free tier available**:

```bash
# Install and run
pip install localstack
localstack start

# Or with Docker
docker run -d -p 4566:4566 localstack/localstack
```

**Free tier services** (no Pro license needed):
- S3, SQS, SNS, Lambda, DynamoDB, IAM, CloudWatch, Secrets Manager, SSM, STS, API Gateway, CloudFormation, EC2 (basic), Route53, ACM

---

## Configure AWS SDK

```typescript
import { S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
  forcePathStyle: true,
});
```

---

## AWS CLI with LocalStack

```bash
aws --endpoint-url=http://localhost:4566 s3 mb s3://my-bucket
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name my-queue
aws --endpoint-url=http://localhost:4566 dynamodb create-table ...
```

---

## DynamoDB Local

AWS provides an official local DynamoDB:

```bash
# Docker
docker run -d -p 8000:8000 amazon/dynamodb-local

# Or download JAR
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
```

```typescript
const dynamodb = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'local',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});
```

---

## AWS SAM Local (Lambda)

```bash
# Install SAM CLI
brew install aws-sam-cli

# Invoke Lambda locally
sam local invoke MyFunction --event event.json

# Start local API Gateway
sam local start-api
```

---

## Moto (Python AWS Mock)

For Python projects, Moto mocks AWS services in-memory:

```python
import boto3
from moto import mock_aws

@mock_aws
def test_s3_upload():
    s3 = boto3.client('s3', region_name='us-east-1')
    s3.create_bucket(Bucket='my-bucket')
    s3.put_object(Bucket='my-bucket', Key='test.txt', Body='hello')
```

---

## Custom Action for S3

```typescript
autonomoRegisterCustomAction('uploadToS3', async (params) => {
  const { bucket, key, content } = JSON.parse(params);
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: content,
  }));
  return { success: true, url: `http://localhost:4566/${bucket}/${key}` };
});
```
