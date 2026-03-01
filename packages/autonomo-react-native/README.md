# autonomo-react-native

React Native integration for [Autonomo](https://github.com/sebringj/autonomo) - AI-powered application testing.

## Installation

Install from npm:

```bash
npm install autonomo-react-native
```

Optional GitHub install (if you need unreleased commits):

```bash
npm install autonomo-react-native
```

For local development, you can also link from this monorepo:

```bash
# From the autonomo repo root
cd packages/autonomo-react-native
npm link

# In your React Native project
npm link autonomo-react-native
```

## Quick Start

```tsx
import { useAutonomo, useTapHandler, useFillHandler } from 'autonomo-react-native';

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
- Same hooks API as `autonomo-react`
- Expo support via expo-constants

## Status

This package is published on npm. For production stability, pin a specific version.
