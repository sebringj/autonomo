# autonomo-angular

> ⚠️ **Testing Only** - This package is not yet published to npm. It is included for testing and development purposes only.

Angular integration for [Autonomo](https://github.com/sebringj/autonomo) - AI-powered application testing.

## Installation

For local development/testing, link the package from this monorepo:

```bash
# From the autonomo repo root
cd packages/autonomo-angular
npm link

# In your Angular project
npm link autonomo-angular
```

## Quick Start

### 1. Configure the module

**Using NgModule:**

```typescript
import { AutonomoModule } from 'autonomo-angular';

@NgModule({
  imports: [
    AutonomoModule.forRoot({
      name: 'my-app',
      serverUrl: 'ws://localhost:9876',
      debug: true, // optional
    }),
  ],
})
export class AppModule {}
```

**Using Standalone Components:**

```typescript
import { AutonomoService, AUTONOMO_DIRECTIVES } from 'autonomo-angular';

@Component({
  standalone: true,
  imports: [...AUTONOMO_DIRECTIVES],
  providers: [AutonomoService],
})
export class AppComponent {
  private autonomo = inject(AutonomoService);
  
  ngOnInit() {
    this.autonomo.init({
      name: 'my-app',
      serverUrl: 'ws://localhost:9876',
    });
  }
}
```

### 2. Mark interactive elements

Use directives to register elements:

```html
<div autonomoScreen="login-page">
  <input 
    autonomoFill="email-input" 
    [(ngModel)]="email"
    autonomoHint="Enter your email address"
  />
  
  <input 
    autonomoFill="password-input" 
    [(ngModel)]="password"
    type="password"
  />
  
  <input 
    type="checkbox" 
    autonomoToggle="remember-me"
    [(ngModel)]="rememberMe"
  />
  
  <button 
    autonomoTap="submit-btn" 
    [autonomoTapHandler]="onSubmit"
  >
    Login
  </button>
</div>
```

### 3. Set screen and user context

```typescript
import { AutonomoService } from 'autonomo-angular';

@Component({ ... })
export class DashboardComponent {
  private autonomo = inject(AutonomoService);
  
  ngOnInit() {
    // Track current screen
    this.autonomo.setScreen('dashboard');
    
    // Track user context
    this.autonomo.setUser({
      id: this.user.id,
      email: this.user.email,
      role: this.user.role,
    });
    
    // Track additional app data
    this.autonomo.mergeData({
      cartItems: this.cart.length,
      notifications: this.notifications.unread,
    });
  }
}
```

### 4. Configure MCP

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "autonomo": {
      "command": "autonomo-mcp",
      "env": {
        "AUTONOMO_PORT": "9876"
      }
    }
  }
}
```

## Directives

### `autonomoTap`

Registers a tappable/clickable element:

```html
<button 
  autonomoTap="action-button"
  [autonomoTapHandler]="handleClick"
  [autonomoDisabled]="isLoading"
  autonomoHint="Triggers the main action"
>
  Click Me
</button>
```

### `autonomoFill`

Registers a fillable input:

```html
<input
  autonomoFill="search-input"
  [(ngModel)]="searchTerm"
  [autonomoOnSubmit]="onSearch"
  autonomoHint="Search for products"
/>
```

### `autonomoToggle`

Registers a toggle (checkbox, switch, radio):

```html
<input
  type="checkbox"
  autonomoToggle="dark-mode"
  [(ngModel)]="darkMode"
/>
```

### `autonomoScreen`

Sets the current screen/page name:

```html
<div autonomoScreen="settings-page">
  <!-- page content -->
</div>
```

## Custom Actions

For complex flows that can't be expressed as single element interactions:

```typescript
import { useCustomAction } from 'autonomo-angular';

@Component({ ... })
export class OtpComponent {
  constructor() {
    useCustomAction('enterOTP', async (value) => {
      if (!value || value.length !== 6) {
        return { success: false, error: 'OTP must be 6 digits' };
      }
      
      // Fill all OTP boxes
      this.otpDigits = value.split('');
      
      return { success: true, message: 'OTP entered' };
    });
  }
}
```

## Service API

### AutonomoService

```typescript
class AutonomoService {
  // Observables (for RxJS)
  connected$: Observable<boolean>;
  bridgeId$: Observable<string | null>;
  
  // Signals (for Angular 16+)
  connected: Signal<boolean>;
  bridgeId: Signal<string | null>;
  
  // Methods
  init(config: AutonomoConfig): void;
  setScreen(screen: string): void;
  setUser(user: { id?: string; email?: string; role?: string }): void;
  mergeData(data: Record<string, unknown>): void;
  reportState(): void;
}
```

## Development vs Production

Only enable Autonomo in development:

```typescript
import { environment } from './environments/environment';

@NgModule({
  imports: [
    ...(environment.production ? [] : [
      AutonomoModule.forRoot({
        name: 'my-app',
      }),
    ]),
  ],
})
export class AppModule {}
```

Or with standalone:

```typescript
@Component({ ... })
export class AppComponent {
  private autonomo = inject(AutonomoService, { optional: true });
  
  ngOnInit() {
    if (!environment.production) {
      this.autonomo?.init({ name: 'my-app' });
    }
  }
}
```

## Troubleshooting

### Elements not appearing

Ensure directives are imported:

```typescript
// NgModule
@NgModule({
  imports: [AutonomoModule],
})

// Standalone
@Component({
  imports: [...AUTONOMO_DIRECTIVES],
})
```

### Connection issues

Check the WebSocket server is running:

```typescript
this.autonomo.connected$.subscribe(connected => {
  console.log('Autonomo connected:', connected);
});
```

### Debug mode

Enable debug logging:

```typescript
AutonomoModule.forRoot({
  name: 'my-app',
  debug: true,
})
```

## Full Documentation

- [Main README](https://github.com/sebringj/autonomo)
- [QUICKSTART](https://github.com/sebringj/autonomo/blob/main/QUICKSTART.md)
- [Protocol Specification](https://github.com/sebringj/autonomo/blob/main/PROTOCOL_SPECIFICATION.md)
