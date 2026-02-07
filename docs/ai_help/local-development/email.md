# Email Testing

> **Purpose**: Capture and inspect emails locally without sending real mail.

---

## Mailhog (Local SMTP)

```bash
# Run Mailhog
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Configure app
SMTP_HOST=localhost
SMTP_PORT=1025
```

View emails at `http://localhost:8025`

---

## Custom Action: Get Verification Link

```typescript
autonomoRegisterCustomAction('getVerificationLink', async (email) => {
  // Fetch from Mailhog API
  const response = await fetch('http://localhost:8025/api/v2/messages');
  const messages = await response.json();
  const latest = messages.items.find(m => 
    m.To[0].Mailbox === email.split('@')[0]
  );
  // Parse verification link from email body
  const link = extractLink(latest.Content.Body);
  return { link };
});
```

---

## Mailtrap

```bash
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
```

---

## Resend (Dev Mode)

Resend allows sending to your own domain in dev mode without verification.

---

## VS Code Task for Mailhog

```json
{
  "label": "📧 Email Server (Mailhog)",
  "type": "shell",
  "command": "docker",
  "args": ["run", "-d", "-p", "1025:1025", "-p", "8025:8025", "mailhog/mailhog"],
  "isBackground": false
}
```
