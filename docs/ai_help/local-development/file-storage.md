# File Storage

> **Purpose**: Local file storage for uploads and media.

---

## Supabase Storage (Local)

Included with `supabase start`.

```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('avatars')
  .upload('user1.png', file);
```

---

## MinIO (S3-Compatible)

```bash
docker run -d -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

Console at `http://localhost:9001`

```typescript
// Point AWS SDK to MinIO
const s3 = new S3Client({
  endpoint: 'http://localhost:9000',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true,
});
```

---

## Cloudflare R2 (Local with Wrangler)

```bash
wrangler r2 bucket create my-bucket --local
```

---

## Custom Action: Upload File

```typescript
autonomoRegisterCustomAction('uploadFile', async (params) => {
  const { bucket, key, content } = JSON.parse(params);
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: content,
  }));
  return { success: true, url: `http://localhost:9000/${bucket}/${key}` };
});
```
