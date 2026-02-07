# AI / LLM Services

> **Purpose**: Run LLM inference locally for testing AI features.

---

## Ollama (Local LLM) ⭐

```bash
# Install
brew install ollama

# Run local LLM
ollama run llama2

# API compatible with OpenAI format
curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Hello!"
}'
```

---

## LM Studio

Run any GGUF model locally with OpenAI-compatible API.

1. Download from [lmstudio.ai](https://lmstudio.ai)
2. Load a model
3. Start local server (usually port 1234)
4. Use OpenAI SDK with custom endpoint

---

## LocalAI

```bash
docker run -p 8080:8080 localai/localai
```

OpenAI-compatible API at `http://localhost:8080`.

---

## Custom Action: Mock AI Response

For testing without running a local LLM:

```typescript
autonomoRegisterCustomAction('mockAI', async (prompt) => {
  // Return predictable responses for testing
  const responses = {
    'hello': 'Hello! How can I help?',
    'weather': 'It looks sunny today.',
    'default': 'I understand. Let me help with that.'
  };
  
  const key = Object.keys(responses).find(k => 
    prompt.toLowerCase().includes(k)
  ) || 'default';
  
  return { response: responses[key] };
});
```

---

## Point OpenAI SDK to Local

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:11434/v1', // Ollama
  apiKey: 'not-needed', // Local doesn't need key
});
```
