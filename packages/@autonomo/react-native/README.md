# @autonomo/react-native

> ⚠️ **Testing Only** - This package is not yet published to npm. It is included for testing and development purposes only.

React Native integration for [Autonomo](https://github.com/sebringj/autonomo) - AI-powered application testing.

## Installation

For local development/testing, link the package from this monorepo:

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

This package is provided for local testing only. For React Native apps in production, check for updates to the npm published version.
