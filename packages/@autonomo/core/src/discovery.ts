/**
 * Auto-Discovery Module
 * 
 * Discovers interactive elements from existing attributes without
 * requiring explicit useTestId() calls. Reduces integration friction.
 * 
 * Supported attribute sources (in priority order):
 * 1. data-auto="Screen.Element" (Autonomo convention)
 * 2. data-testid="element-id" (Common test convention)
 * 3. testID="element-id" (React Native convention)
 * 4. accessibilityLabel="..." (A11y - recommended)
 * 5. aria-label="..." (Web a11y)
 * 6. name="..." (Form inputs)
 * 7. id="..." (HTML id)
 * 8. placeholder="..." (Input placeholders)
 */

import type { ElementInfo, ElementType } from './registry.js';

export interface DiscoveryOptions {
  /** Root element to scan (default: document.body for web) */
  root?: unknown;
  /** Whether to include elements without explicit IDs (inferred from text) */
  includeInferred?: boolean;
  /** Custom attribute name to look for (default: 'data-auto') */
  autoAttribute?: string;
}

export interface DiscoveredElement extends ElementInfo {
  /** How this element was discovered */
  source: 'data-auto' | 'testid' | 'accessibility' | 'aria' | 'name' | 'id' | 'placeholder' | 'inferred';
  /** Native element reference (for interaction) */
  nativeRef?: unknown;
}

/**
 * Infer element type from tag name and attributes
 */
function inferElementType(tagName: string, attrs: Record<string, string>): ElementType {
  const tag = tagName.toLowerCase();
  
  // Input types
  if (tag === 'input') {
    const type = attrs.type?.toLowerCase() || 'text';
    if (type === 'submit' || type === 'button') return 'button';
    if (type === 'checkbox' || type === 'radio') return 'toggle';
    return 'input';
  }
  
  // Explicit types
  if (tag === 'button') return 'button';
  if (tag === 'a') return 'link';
  if (tag === 'select') return 'select';
  if (tag === 'textarea') return 'input';
  
  // Interactive roles
  const role = attrs.role?.toLowerCase();
  if (role === 'button') return 'button';
  if (role === 'link') return 'link';
  if (role === 'checkbox' || role === 'switch') return 'toggle';
  if (role === 'textbox') return 'input';
  if (role === 'combobox' || role === 'listbox') return 'select';
  
  // Clickable elements (React Native TouchableOpacity etc.)
  if (attrs.onClick || attrs.onPress || attrs['aria-pressed'] !== undefined) {
    return 'button';
  }
  
  return 'custom';
}

/**
 * Get actions supported by element type
 */
function getActionsForType(type: ElementType): string[] {
  switch (type) {
    case 'button':
    case 'link':
      return ['press'];
    case 'input':
      return ['fillIn', 'submit'];
    case 'toggle':
      return ['press'];
    case 'select':
      return ['press']; // Opens picker
    default:
      return ['press'];
  }
}

/**
 * Normalize an ID to Screen.Element format
 */
function normalizeId(rawId: string, source: string): string {
  // Already in Screen.Element format
  if (rawId.includes('.')) return rawId;
  
  // Convert kebab-case to PascalCase
  const pascalCase = rawId
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  
  // Prefix with source hint
  return `Auto.${pascalCase}`;
}

/**
 * Extract ID from element attributes (priority order)
 */
function extractId(
  attrs: Record<string, string | undefined>,
  autoAttribute: string
): { id: string; source: DiscoveredElement['source'] } | null {
  // 1. Autonomo convention (highest priority)
  if (attrs[autoAttribute]) {
    return { id: attrs[autoAttribute]!, source: 'data-auto' };
  }
  
  // 2. Common test conventions
  if (attrs['data-testid']) {
    return { id: normalizeId(attrs['data-testid'], 'testid'), source: 'testid' };
  }
  if (attrs.testID) {
    return { id: normalizeId(attrs.testID, 'testid'), source: 'testid' };
  }
  
  // 3. Accessibility labels (preferred for semantic meaning)
  if (attrs.accessibilityLabel) {
    return { id: normalizeId(attrs.accessibilityLabel, 'a11y'), source: 'accessibility' };
  }
  if (attrs['aria-label']) {
    return { id: normalizeId(attrs['aria-label'], 'aria'), source: 'aria' };
  }
  
  // 4. Form attributes
  if (attrs.name) {
    return { id: normalizeId(attrs.name, 'name'), source: 'name' };
  }
  if (attrs.id) {
    return { id: normalizeId(attrs.id, 'id'), source: 'id' };
  }
  
  // 5. Placeholder (inputs only, lower priority)
  if (attrs.placeholder) {
    return { id: normalizeId(attrs.placeholder, 'placeholder'), source: 'placeholder' };
  }
  
  return null;
}

/**
 * Web DOM discovery implementation
 */
export function discoverWebElements(options: DiscoveryOptions = {}): DiscoveredElement[] {
  if (typeof document === 'undefined') return [];
  
  const {
    root = document.body,
    includeInferred = false,
    autoAttribute = 'data-auto',
  } = options;
  
  const elements: DiscoveredElement[] = [];
  const seen = new Set<string>();
  
  // Interactive element selectors
  const selectors = [
    'button',
    'a[href]',
    'input',
    'textarea',
    'select',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="switch"]',
    '[role="textbox"]',
    '[onclick]',
    `[${autoAttribute}]`,
    '[data-testid]',
    '[aria-label]',
  ].join(', ');
  
  const nodeList = (root as Element).querySelectorAll(selectors);
  
  nodeList.forEach((el) => {
    const htmlEl = el as HTMLElement;
    
    // Skip hidden/disabled
    if (htmlEl.hidden || htmlEl.getAttribute('aria-hidden') === 'true') return;
    if ((htmlEl as HTMLButtonElement).disabled) return;
    
    // Gather attributes
    const attrs: Record<string, string | undefined> = {
      [autoAttribute]: htmlEl.getAttribute(autoAttribute) || undefined,
      'data-testid': htmlEl.getAttribute('data-testid') || undefined,
      testID: htmlEl.getAttribute('testID') || undefined,
      accessibilityLabel: htmlEl.getAttribute('accessibilityLabel') || undefined,
      'aria-label': htmlEl.getAttribute('aria-label') || undefined,
      name: htmlEl.getAttribute('name') || undefined,
      id: htmlEl.id || undefined,
      placeholder: htmlEl.getAttribute('placeholder') || undefined,
      type: htmlEl.getAttribute('type') || undefined,
      role: htmlEl.getAttribute('role') || undefined,
      onClick: htmlEl.onclick ? 'true' : undefined,
    };
    
    const extracted = extractId(attrs, autoAttribute);
    
    // Try to infer from text content if enabled
    let idInfo = extracted;
    if (!idInfo && includeInferred) {
      const text = htmlEl.textContent?.trim();
      if (text && text.length < 50) {
        idInfo = { id: normalizeId(text, 'inferred'), source: 'inferred' as const };
      }
    }
    
    if (!idInfo) return;
    
    // Dedupe
    if (seen.has(idInfo.id)) return;
    seen.add(idInfo.id);
    
    const type = inferElementType(htmlEl.tagName, attrs as Record<string, string>);
    
    elements.push({
      id: idInfo.id,
      type,
      actions: getActionsForType(type),
      source: idInfo.source,
      disabled: (htmlEl as HTMLButtonElement).disabled,
      value: (htmlEl as HTMLInputElement).value || undefined,
      nativeRef: htmlEl,
    });
  });
  
  return elements;
}

/**
 * Merge auto-discovered elements with explicitly registered ones.
 * Explicit registrations take priority.
 */
export function mergeWithExplicit(
  discovered: DiscoveredElement[],
  explicit: ElementInfo[]
): ElementInfo[] {
  const explicitIds = new Set(explicit.map(e => e.id));
  
  // Explicit first, then discovered (filtered)
  const discoveredFiltered = discovered
    .filter(d => !explicitIds.has(d.id))
    .map(({ source, nativeRef, ...info }) => info); // Strip discovery metadata
  
  return [...explicit, ...discoveredFiltered];
}
