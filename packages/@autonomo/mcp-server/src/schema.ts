/**
 * Schema Descriptors for Autonomo
 *
 * Provides documented schemas that can be used to auto-generate
 * MCP tool descriptions, keeping them in sync with the actual types.
 */

/**
 * Field descriptor for schema documentation
 */
export interface FieldDescriptor {
  /** Type of the field (string, number, array, object, etc.) */
  type: string;
  /** Human-readable description for AI */
  description: string;
  /** Whether this field is required */
  required?: boolean;
  /** Example value(s) */
  examples?: unknown[];
  /** For arrays: item descriptor */
  items?: FieldDescriptor | SchemaDescriptor;
  /** For objects: nested schema */
  properties?: Record<string, FieldDescriptor>;
}

/**
 * Schema descriptor for a type
 */
export interface SchemaDescriptor {
  /** Name of the type */
  name: string;
  /** High-level description */
  description: string;
  /** Field descriptors */
  properties: Record<string, FieldDescriptor>;
}

// ============================================================================
// Element Schemas
// ============================================================================

export const ElementTypeSchema: FieldDescriptor = {
  type: 'string',
  description:
    'Type of element: "button" (clickable), "input" (text entry), "toggle" (on/off), "select" (dropdown), "link" (navigation), "custom" (app-specific)',
  examples: ['button', 'input', 'toggle', 'select', 'link', 'custom'],
};

export const ElementInfoSchema: SchemaDescriptor = {
  name: 'ElementInfo',
  description:
    'An interactive element that the AI can interact with. Elements must be registered via autonomoRegister() or useAutonomoElement() hook.',
  properties: {
    id: {
      type: 'string',
      required: true,
      description:
        'Unique identifier for the element. Use this ID in send_command to interact with it.',
      examples: ['Login.SubmitButton', 'Tab.home', 'Form.EmailInput'],
    },
    type: ElementTypeSchema,
    actions: {
      type: 'array',
      required: true,
      description:
        'Actions this element supports. Use these action names with send_command.',
      items: {
        type: 'string',
        description: '"press" for buttons, "fillIn"/"submit" for inputs, "toggle" for switches',
      },
      examples: [['press'], ['fillIn', 'submit'], ['toggle']],
    },
    disabled: {
      type: 'boolean',
      description: 'If true, the element is currently disabled and cannot be interacted with.',
      examples: [false, true],
    },
    value: {
      type: 'string',
      description: 'Current value (for inputs). Check this to see what text is already entered.',
      examples: ['user@example.com', ''],
    },
    hint: {
      type: 'string',
      description:
        'Usage hint from the app developer. May contain test credentials or special instructions.',
      examples: ['Use test phone: +1 555-0123', 'OTP in dev mode: 111111'],
    },
    label: {
      type: 'string',
      description: 'Human-readable label for the element.',
      examples: ['Submit', 'Email Address', 'Home Tab'],
    },
    meta: {
      type: 'object',
      description: 'Additional app-specific metadata.',
    },
  },
};

// ============================================================================
// Custom Action Schemas
// ============================================================================

export const CustomActionInfoSchema: SchemaDescriptor = {
  name: 'CustomActionInfo',
  description:
    'A custom action registered by the app. Custom actions bypass UI and perform complex operations atomically. Invoke via send_command with action="custom".',
  properties: {
    name: {
      type: 'string',
      required: true,
      description: 'Action name. Use this as the "target" in send_command with action="custom".',
      examples: ['fillOtp', 'loginAs', 'addRole', 'seedTestData'],
    },
    description: {
      type: 'string',
      description: 'What this action does.',
      examples: [
        'Fill all 6 OTP digits at once',
        'Login as a specific user type',
        'Add a role to the current user',
      ],
    },
    args: {
      type: 'object',
      description:
        'Argument schema. Keys are arg names, values describe the expected type/format.',
      examples: [{ code: 'string (6 digits)' }, { email: 'string', role: 'admin|user|guest' }],
    },
    example: {
      type: 'object',
      description: 'Example invocation showing how to call this action.',
      properties: {
        value: {
          type: 'string',
          description: 'Example value to pass',
        },
      },
      examples: [{ value: '111111' }, { value: 'coach' }],
    },
  },
};

// ============================================================================
// User Context Schema
// ============================================================================

export const UserContextSchema: SchemaDescriptor = {
  name: 'UserContext',
  description: 'Information about the currently logged-in user (if any).',
  properties: {
    id: {
      type: 'string',
      description: 'User ID',
      examples: ['user-123', '0a29ed6c-64de-4f7c-8818-402718e439bd'],
    },
    email: {
      type: 'string',
      description: 'User email address',
      examples: ['user@example.com'],
    },
    role: {
      type: 'string',
      description: 'Current user role (if applicable)',
      examples: ['admin', 'coach', 'parent', 'player'],
    },
  },
};

// ============================================================================
// Suggested Flow Schema
// ============================================================================

export const SuggestedActionSchema: SchemaDescriptor = {
  name: 'SuggestedAction',
  description:
    'A suggested action in a workflow. Apps can provide these to guide the AI through typical flows.',
  properties: {
    action: {
      type: 'string',
      required: true,
      description: 'Action to perform: press, fillIn, navigate, custom',
      examples: ['press', 'fillIn', 'navigate', 'custom'],
    },
    target: {
      type: 'string',
      required: true,
      description: 'Target element ID or route',
      examples: ['Login.SubmitButton', '/home', 'addRole'],
    },
    value: {
      type: 'string',
      description: 'Value for fillIn or custom actions',
      examples: ['test@example.com', 'coach'],
    },
    description: {
      type: 'string',
      description: 'Human-readable step description',
      examples: ['Enter email', 'Click submit', 'Add coach role'],
    },
  },
};

// ============================================================================
// Main AppState Schema
// ============================================================================

export const AppStateSchema: SchemaDescriptor = {
  name: 'AppState',
  description: `Complete snapshot of the application state. This is what get_state returns.

CRITICAL NOTES:
• Elements appear ONLY if explicitly registered via autonomoRegister() or useAutonomoElement()
• Just adding testID does NOT make an element visible
• Custom actions can do ANYTHING - database ops, role changes, test data setup
• Check errors array after every command to catch async failures
• screenHint and suggestedFlow provide app-specific guidance`,
  properties: {
    screen: {
      type: 'string',
      required: true,
      description: 'Current screen/route name. Use this in navigate commands.',
      examples: ['/login', '/home', '/(tabs)/settings', '/league/[id]'],
    },
    timestamp: {
      type: 'number',
      required: true,
      description: 'Unix timestamp of this state snapshot (milliseconds since epoch).',
      examples: [1738944000000],
    },
    instance: {
      type: 'object',
      description:
        'Instance identity info (app name, platform, version). Helps identify which app this state is from.',
      properties: {
        id: { type: 'string', description: 'Instance ID' },
        name: { type: 'string', description: 'App name' },
        platform: { type: 'string', description: 'Platform: web, mobile, desktop' },
        version: { type: 'string', description: 'App version' },
      },
    },
    user: {
      type: 'object',
      description: 'Currently logged-in user info (if any). Undefined if not logged in.',
      properties: UserContextSchema.properties,
    },
    screenHint: {
      type: 'string',
      description:
        'AI guidance from the app developer about this screen. Read this for context about the screen purpose and usage.',
      examples: [
        'Enter phone number and tap Send Code. After receiving code, use fillOtp custom action.',
        'Dashboard shows user stats. Tap any card for details.',
      ],
    },
    suggestedFlow: {
      type: 'array',
      description:
        'Suggested sequence of actions for this screen. Follow this for typical workflows.',
      items: SuggestedActionSchema,
    },
    elements: {
      type: 'array',
      required: true,
      description:
        'Interactive elements currently available. ONLY explicitly registered elements appear here.',
      items: ElementInfoSchema,
    },
    customActions: {
      type: 'array',
      required: true,
      description:
        'Custom actions available. These bypass UI for complex operations. Invoke with action="custom", target=actionName.',
      items: CustomActionInfoSchema,
    },
    data: {
      type: 'object',
      description: 'App-specific data exposed for AI inspection.',
    },
    errors: {
      type: 'array',
      required: true,
      description:
        'Recent errors. ALWAYS check this after commands - API errors appear here after async completion.',
      items: { type: 'string', description: 'Error message' },
      examples: [[], ['Network error: Failed to fetch'], ['Invalid phone number format']],
    },
    logs: {
      type: 'array',
      description: 'Recent console logs (if tracked).',
      items: { type: 'string', description: 'Log message' },
    },
    renderErrors: {
      type: 'array',
      description: 'React/component render errors.',
      items: { type: 'string', description: 'Render error message' },
    },
    network: {
      type: 'array',
      description: 'Recent network requests (if tracked).',
      items: {
        type: 'object',
        description: 'Network request info',
        properties: {
          method: { type: 'string', description: 'HTTP method', examples: ['GET', 'POST'] },
          url: { type: 'string', description: 'Request URL' },
          status: { type: 'number', description: 'HTTP status code', examples: [200, 404, 500] },
          duration: { type: 'number', description: 'Request duration in ms' },
          error: { type: 'string', description: 'Error message if failed' },
        },
      },
    },
  },
};

// ============================================================================
// Generator Functions
// ============================================================================

/**
 * Generate a markdown description of a schema for use in MCP tool descriptions
 */
export function schemaToMarkdown(schema: SchemaDescriptor, indent = 0): string {
  const lines: string[] = [];
  const pad = '  '.repeat(indent);

  lines.push(`${pad}${schema.description}`);
  lines.push('');
  lines.push(`${pad}Fields:`);

  for (const [name, field] of Object.entries(schema.properties)) {
    let line = `${pad}• ${name}`;
    if (field.required) line += ' (required)';
    line += `: ${field.description}`;
    lines.push(line);

    if (field.examples && field.examples.length > 0) {
      const examplesStr = field.examples
        .slice(0, 3)
        .map((e) => JSON.stringify(e))
        .join(', ');
      lines.push(`${pad}  Examples: ${examplesStr}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate a concise summary of element capabilities for tool descriptions
 */
export function generateElementSummary(): string {
  return `Elements include:
• id: Element identifier (use in send_command target)
• type: button, input, toggle, select, link, custom
• actions: What actions are supported (press, fillIn, submit, toggle)
• disabled: Whether element is currently disabled
• value: Current value (for inputs)
• hint: Developer notes (may include test credentials)`;
}

/**
 * Generate a concise summary of custom actions for tool descriptions
 */
export function generateCustomActionSummary(): string {
  return `Custom Actions include:
• name: Action name (use as target with action="custom")
• description: What the action does
• args: Expected arguments schema
• example: Example invocation`;
}

/**
 * Generate the full get_state tool description from schemas
 */
export function generateGetStateDescription(): string {
  const sections: string[] = [];

  sections.push(
    'Get the current state of an application. Returns screen name, user info, available elements, custom actions, and any errors.'
  );
  sections.push('');
  sections.push('IMPORTANT - Element Registration:');
  sections.push(
    '• Elements appear in state ONLY if the app explicitly registers them via autonomoRegister() or useAutonomoElement() hook'
  );
  sections.push(
    '• Just adding testID/data-testid to a component does NOT make it visible to Autonomo'
  );
  sections.push('• Custom actions are registered via autonomoRegisterCustomAction(name, handler)');
  sections.push('');
  sections.push(generateElementSummary());
  sections.push('');
  sections.push(generateCustomActionSummary());

  return sections.join('\n');
}

/**
 * Generate the full send_command tool description from schemas
 */
export function generateSendCommandDescription(): string {
  return `Send a command to an application.

Actions:
• navigate: Go to a screen/route (target = screen name like "/home" or "/(tabs)/settings")
• press: Tap a button or interactive element (target = element ID from get_state)
• fillIn/fill: Enter text into an input (target = input element ID, value = text)
• submit: Press enter/submit on an input (target = input element ID)
• custom: Execute app-specific action (target = action name, value = optional parameter)

CRITICAL: The target must be an element ID returned by get_state. If an element is not listed in get_state, the app has not registered it and the command will fail.

Custom Actions (POWERFUL):
• Apps can register custom actions that do ANYTHING - database operations, role changes, test data setup, complex multi-step flows
• Custom actions are the recommended way to add shortcuts for testing
• Use action="custom", target=actionName, value=optionalParam
• Check get_state response for available customActions`;
}

/**
 * Generate a JSON Schema from our schema descriptor (for MCP inputSchema)
 */
export function toJsonSchema(
  descriptor: SchemaDescriptor | FieldDescriptor
): Record<string, unknown> {
  if ('properties' in descriptor && !('items' in descriptor)) {
    // SchemaDescriptor or object FieldDescriptor
    const schema = descriptor as SchemaDescriptor;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [name, field] of Object.entries(schema.properties)) {
      properties[name] = toJsonSchema(field);
      if (field.required) {
        required.push(name);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  // FieldDescriptor
  const field = descriptor as FieldDescriptor;
  const result: Record<string, unknown> = {
    type: field.type,
    description: field.description,
  };

  if (field.examples && field.examples.length > 0) {
    result.examples = field.examples;
  }

  if (field.items) {
    result.items = toJsonSchema(field.items);
  }

  if (field.properties) {
    const props: Record<string, unknown> = {};
    for (const [name, prop] of Object.entries(field.properties)) {
      props[name] = toJsonSchema(prop);
    }
    result.properties = props;
  }

  return result;
}
