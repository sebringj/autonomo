# Autonomo Provider Pattern for React

> **For AI Assistants**: This document describes patterns for making React UI state visible to Autonomo.

## The Problem

Autonomo sees elements via `data-testid` attributes, but ephemeral UI states like:
- Toast notifications
- Alert banners
- Modal dialogs
- Loading overlays
- Error messages

...often appear and disappear quickly, or may not have proper testIDs wired up.

## Solution: Centralized Provider with TestIDs

Create a single provider that wraps your app and exposes all transient UI to Autonomo.

### Basic AutonomoProvider

```tsx
// AutonomoProvider.tsx
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

export type AlertType = 'info' | 'success' | 'warning' | 'error';

export interface AlertOptions {
  type: AlertType;
  title?: string;
  message: string;
  /** Auto-dismiss after ms (0 = no auto-dismiss) */
  duration?: number;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AlertState extends AlertOptions {
  id: string;
}

interface AutonomoContextValue {
  alert: (options: AlertOptions) => void;
  dismiss: (id?: string) => void;
  alerts: AlertState[];
}

// =============================================================================
// Context & Global Reference
// =============================================================================

const AutonomoContext = createContext<AutonomoContextValue | null>(null);

// Global reference for calling from anywhere (not just React components)
let globalAlertFn: ((options: AlertOptions) => void) | null = null;
let globalDismissFn: ((id?: string) => void) | null = null;

/**
 * Show alert from anywhere - works outside React components
 */
export function showAlert(options: AlertOptions): void {
  if (globalAlertFn) {
    globalAlertFn(options);
  } else {
    console.warn('[showAlert] AutonomoProvider not mounted');
  }
}

/**
 * Dismiss alert from anywhere
 */
export function dismissAlert(id?: string): void {
  globalDismissFn?.(id);
}

// =============================================================================
// Hook
// =============================================================================

export function useAlert(): AutonomoContextValue {
  const context = useContext(AutonomoContext);
  if (!context) {
    throw new Error('useAlert must be used within AutonomoProvider');
  }
  return context;
}

// =============================================================================
// Alert Component with TestIDs
// =============================================================================

function AlertToast({ alert, onDismiss }: { alert: AlertState; onDismiss: () => void }) {
  // Autonomo sees these testIDs:
  // - App.Alert.{type} - the alert container
  // - App.Alert.Title - the title text
  // - App.Alert.Message - the message text  
  // - App.Alert.Dismiss - the dismiss button
  // - App.Alert.Action - optional action button
  
  return (
    <div
      data-testid={`App.Alert.${alert.type}`}
      role="alert"
      className={`alert alert-${alert.type}`}
    >
      {alert.title && (
        <strong data-testid="App.Alert.Title">{alert.title}</strong>
      )}
      <span data-testid="App.Alert.Message">{alert.message}</span>
      
      {alert.action && (
        <button
          data-testid="App.Alert.Action"
          onClick={alert.action.onClick}
        >
          {alert.action.label}
        </button>
      )}
      
      <button
        data-testid="App.Alert.Dismiss"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

// =============================================================================
// Provider
// =============================================================================

export function AutonomoProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertState[]>([]);

  const dismiss = useCallback((id?: string) => {
    if (id) {
      setAlerts(prev => prev.filter(a => a.id !== id));
    } else {
      setAlerts(prev => prev.slice(0, -1));
    }
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    const defaultDuration = options.type === 'info' || options.type === 'success' ? 5000 : 0;
    const duration = options.duration ?? defaultDuration;

    setAlerts(prev => [...prev, { ...options, id }]);

    if (duration > 0) {
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }, duration);
    }
  }, []);

  // Set global references on mount
  useEffect(() => {
    globalAlertFn = alert;
    globalDismissFn = dismiss;
    return () => {
      globalAlertFn = null;
      globalDismissFn = null;
    };
  }, [alert, dismiss]);

  return (
    <AutonomoContext.Provider value={{ alert, dismiss, alerts }}>
      {children}
      
      {/* Alert Container - Autonomo can see all active alerts */}
      {alerts.length > 0 && (
        <div data-testid="App.AlertContainer" className="alert-container">
          {alerts.map(alertState => (
            <AlertToast
              key={alertState.id}
              alert={alertState}
              onDismiss={() => dismiss(alertState.id)}
            />
          ))}
        </div>
      )}
    </AutonomoContext.Provider>
  );
}

export default AutonomoProvider;
```

### Usage

**Wrap your app once:**

```tsx
// App.tsx
import { AutonomoProvider } from './AutonomoProvider';

function App() {
  return (
    <AutonomoProvider>
      <Router>
        <Routes />
      </Router>
    </AutonomoProvider>
  );
}
```

**Trigger alerts from components:**

```tsx
import { useAlert } from './AutonomoProvider';

function SaveButton() {
  const { alert } = useAlert();
  
  const handleSave = async () => {
    try {
      await saveData();
      alert({ type: 'success', message: 'Saved!' });
    } catch (err) {
      alert({ type: 'error', title: 'Save Failed', message: err.message });
    }
  };
  
  return <button onClick={handleSave}>Save</button>;
}
```

**Trigger alerts from anywhere (non-component code):**

```tsx
import { showAlert } from './AutonomoProvider';

// In an API interceptor, auth handler, etc.
if (response.status === 401) {
  showAlert({
    type: 'warning',
    title: 'Session Expired',
    message: 'Please log in again.',
    action: {
      label: 'Log In',
      onClick: () => navigate('/login')
    }
  });
}
```

## TestID Naming Convention

Use dot-notation namespacing for clear hierarchy:

| Element | TestID |
|---------|--------|
| Alert container | `App.AlertContainer` |
| Info alert | `App.Alert.info` |
| Error alert | `App.Alert.error` |
| Alert title | `App.Alert.Title` |
| Alert message | `App.Alert.Message` |
| Dismiss button | `App.Alert.Dismiss` |

This lets Autonomo:
1. **Detect** alerts via `get_state` → sees `App.Alert.warning`
2. **Read** content via `App.Alert.Title` and `App.Alert.Message`
3. **Dismiss** via `send_command(action: "press", target: "App.Alert.Dismiss")`

## Extending the Provider

Add more transient UI to the same provider:

```tsx
export function AutonomoProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertState[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  
  // ... provider logic
  
  return (
    <AutonomoContext.Provider value={{ /* ... */ }}>
      {children}
      
      {/* Loading Overlay */}
      {loading && (
        <div data-testid="App.Loading" className="loading-overlay">
          Loading...
        </div>
      )}
      
      {/* Confirm Dialog */}
      {confirmDialog && (
        <div data-testid="App.ConfirmDialog" className="modal">
          <p data-testid="App.ConfirmDialog.Message">{confirmDialog.message}</p>
          <button data-testid="App.ConfirmDialog.Confirm" onClick={confirmDialog.onConfirm}>
            {confirmDialog.confirmLabel}
          </button>
          <button data-testid="App.ConfirmDialog.Cancel" onClick={confirmDialog.onCancel}>
            Cancel
          </button>
        </div>
      )}
      
      {/* Alerts */}
      {alerts.length > 0 && (
        <div data-testid="App.AlertContainer">
          {alerts.map(a => <AlertToast key={a.id} alert={a} onDismiss={() => dismiss(a.id)} />)}
        </div>
      )}
    </AutonomoContext.Provider>
  );
}
```

## Why This Pattern?

1. **Single source of truth** - All transient UI flows through one provider
2. **Consistent testIDs** - Autonomo always knows where to look
3. **Global access** - `showAlert()` works from API handlers, auth code, anywhere
4. **Clean component tree** - One wrapper, not scattered providers
5. **LLM-friendly** - Autonomo sees structured state, not hidden DOM

## See Also

- [Custom Actions](./CUSTOM_ACTIONS.md) - For app-specific commands
- [Deno Fresh Integration](./DENO_FRESH_INTEGRATION.md) - Islands architecture patterns
