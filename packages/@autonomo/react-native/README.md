# @autonomo/react-native

> ⚠️ **GitHub/Source Package** - This package is not published to npm yet.

React Native integration for [Autonomo](https://github.com/sebringj/autonomo) - AI-powered application testing.

## Installation

Install directly from GitHub:

```bash
npm install github:sebringj/autonomo#packages/@autonomo/react-native
```

For production, pin to a specific commit SHA for reproducible builds:

```bash
npm install github:sebringj/autonomo#<commit-sha>:packages/@autonomo/react-native
```

For local development, you can also link from this monorepo:

```bash
# From the autonomo repo root
cd packages/@autonomo/react-native
npm link

# In your React Native project
npm link @autonomo/react-native
```

## Quick Start

```tsx
import { useAutonomo, useTapHandler, useFillHandler } from '@autonomo/react-native';

function App() {
  // Initialize Autonomo connection 
  useAutonomo({
    name: 'my-app',
    debug: true,
  });

  return <YourApp />;
}
```

## Features

- WebSocket-based communication with MCP server
- Same hooks API as `@sebringj/autonomo-react`
- Expo support via expo-constants

## Status

This package is currently distributed via GitHub/source (not npm). It can be used in production if pinned to a commit SHA.
