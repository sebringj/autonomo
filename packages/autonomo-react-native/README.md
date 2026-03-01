# autonomo-react-native

React Native integration for [Autonomo](https://github.com/sebringj/autonomo) - AI-powered application testing.

## Installation

```bash
npm install autonomo-react-native
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
