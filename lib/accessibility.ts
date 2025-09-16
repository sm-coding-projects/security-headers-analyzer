// Accessibility utilities for the security headers analyzer

export interface A11yConfig {
  announcements: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  keyboardNavigation: boolean;
  screenReaderOptimizations: boolean;
}

export interface KeyboardNavigation {
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: (event: React.FocusEvent) => void;
  tabIndex?: number;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  role?: string;
}

export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-atomic'?: boolean;
  'aria-relevant'?: string;
  'aria-busy'?: boolean;
  'aria-disabled'?: boolean;
  'aria-pressed'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-selected'?: boolean;
  'aria-current'?: string | boolean;
  role?: string;
}

// Live region announcer for screen readers
class LiveAnnouncer {
  private politeElement: HTMLElement | null = null;
  private assertiveElement: HTMLElement | null = null;

  constructor() {
    this.createLiveRegions();
  }

  private createLiveRegions() {
    if (typeof window === 'undefined') return;

    // Create polite live region
    this.politeElement = document.createElement('div');
    this.politeElement.setAttribute('aria-live', 'polite');
    this.politeElement.setAttribute('aria-atomic', 'true');
    this.politeElement.className = 'sr-only';
    this.politeElement.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;

    // Create assertive live region
    this.assertiveElement = document.createElement('div');
    this.assertiveElement.setAttribute('aria-live', 'assertive');
    this.assertiveElement.setAttribute('aria-atomic', 'true');
    this.assertiveElement.className = 'sr-only';
    this.assertiveElement.style.cssText = this.politeElement.style.cssText;

    document.body.appendChild(this.politeElement);
    document.body.appendChild(this.assertiveElement);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!message.trim()) return;

    const element = priority === 'assertive' ? this.assertiveElement : this.politeElement;
    if (!element) return;

    // Clear previous message
    element.textContent = '';

    // Add new message after a brief delay to ensure screen readers notice the change
    setTimeout(() => {
      element.textContent = message;
    }, 100);

    // Clear message after announcement
    setTimeout(() => {
      element.textContent = '';
    }, 1000);
  }

  announceAnalysisStart(url: string) {
    this.announce(`Starting security analysis for ${url}`, 'polite');
  }

  announceAnalysisComplete(url: string, score: number, grade: string) {
    this.announce(
      `Security analysis complete for ${url}. Score: ${score} out of 100, Grade: ${grade}`,
      'assertive'
    );
  }

  announceError(message: string) {
    this.announce(`Error: ${message}`, 'assertive');
  }

  announceSuccess(message: string) {
    this.announce(`Success: ${message}`, 'polite');
  }
}

export const liveAnnouncer = new LiveAnnouncer();

// Keyboard navigation utilities
export const keyboardNavigation = {
  // Handle escape key to close modals/dropdowns
  handleEscape: (callback: () => void) => (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      callback();
    }
  },

  // Handle enter/space for button-like elements
  handleActivation: (callback: () => void) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  },

  // Handle arrow keys for navigation
  handleArrowNavigation: (options: {
    onUp?: () => void;
    onDown?: () => void;
    onLeft?: () => void;
    onRight?: () => void;
  }) => (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        options.onUp?.();
        break;
      case 'ArrowDown':
        event.preventDefault();
        options.onDown?.();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        options.onLeft?.();
        break;
      case 'ArrowRight':
        event.preventDefault();
        options.onRight?.();
        break;
    }
  },

  // Tab trap for modals
  trapFocus: (containerRef: React.RefObject<HTMLElement>) => (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }
};

// Focus management utilities
export const focusManagement = {
  // Set focus to element with optional delay
  setFocus: (elementOrRef: HTMLElement | React.RefObject<HTMLElement>, delay = 0) => {
    setTimeout(() => {
      const element = 'current' in elementOrRef ? elementOrRef.current : elementOrRef;
      if (element && typeof element.focus === 'function') {
        element.focus();
      }
    }, delay);
  },

  // Move focus to next focusable element
  focusNext: () => {
    const focusableElements = document.querySelectorAll(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as HTMLElement);
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    focusableElements[nextIndex]?.focus();
  },

  // Move focus to previous focusable element
  focusPrevious: () => {
    const focusableElements = document.querySelectorAll(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as HTMLElement);
    const previousIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    focusableElements[previousIndex]?.focus();
  },

  // Create visible focus indicator
  createFocusRing: (element: HTMLElement) => {
    element.style.outline = '2px solid #3b82f6';
    element.style.outlineOffset = '2px';
  },

  // Remove focus indicator
  removeFocusRing: (element: HTMLElement) => {
    element.style.outline = '';
    element.style.outlineOffset = '';
  }
};

// Screen reader utilities
export const screenReader = {
  // Hide element from screen readers
  hide: (ariaHidden = true): AriaAttributes => ({
    'aria-hidden': ariaHidden
  }),

  // Announce loading state
  loading: (isLoading: boolean, label?: string): AriaAttributes => ({
    'aria-busy': isLoading,
    'aria-label': isLoading ? `${label || 'Content'} is loading` : label
  }),

  // Create describedby relationship
  describedBy: (id: string): AriaAttributes => ({
    'aria-describedby': id
  }),

  // Create labelledby relationship
  labelledBy: (id: string): AriaAttributes => ({
    'aria-labelledby': id
  }),

  // Create live region attributes
  liveRegion: (politeness: 'polite' | 'assertive' = 'polite', atomic = true): AriaAttributes => ({
    'aria-live': politeness,
    'aria-atomic': atomic
  }),

  // Expandable/collapsible content
  expandable: (isExpanded: boolean, controlsId?: string): AriaAttributes => ({
    'aria-expanded': isExpanded,
    ...(controlsId && { 'aria-controls': controlsId })
  }),

  // Button states
  button: (pressed?: boolean, disabled?: boolean): AriaAttributes => ({
    role: 'button',
    ...(pressed !== undefined && { 'aria-pressed': pressed }),
    ...(disabled && { 'aria-disabled': disabled })
  }),

  // Progress indicator
  progress: (value?: number, max = 100, label?: string): AriaAttributes => ({
    role: 'progressbar',
    ...(value !== undefined && { 'aria-valuenow': value }),
    'aria-valuemin': 0,
    'aria-valuemax': max,
    ...(label && { 'aria-label': label })
  }),

  // Alert for important messages
  alert: (_message: string): AriaAttributes => ({
    role: 'alert',
    'aria-live': 'assertive',
    'aria-atomic': true
  }),

  // Status for less urgent updates
  status: (): AriaAttributes => ({
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': true
  })
};

// Color contrast utilities
export const colorContrast = {
  // Check if user prefers high contrast
  prefersHighContrast: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: high)').matches;
  },

  // Get high contrast styles
  getHighContrastStyles: () => ({
    border: '2px solid',
    outline: '1px solid',
    backgroundColor: '#000000',
    color: '#ffffff'
  }),

  // Calculate contrast ratio (simplified)
  calculateContrast: (_foreground: string, _background: string): number => {
    // This is a simplified implementation
    // In a real app, you'd use a proper color contrast library
    return 4.5; // Return minimum WCAG AA ratio
  }
};

// Motion preferences
export const motionPreferences = {
  // Check if user prefers reduced motion
  prefersReducedMotion: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Get animation styles based on preference
  getAnimationStyles: (normalAnimation: Record<string, string | number>, reducedAnimation: Record<string, string | number> = {}) => {
    return motionPreferences.prefersReducedMotion() ? reducedAnimation : normalAnimation;
  }
};

// Accessibility hook for React components
export const useAccessibility = (config: Partial<A11yConfig> = {}) => {
  const defaultConfig: A11yConfig = {
    announcements: true,
    highContrast: false,
    reducedMotion: false,
    keyboardNavigation: true,
    screenReaderOptimizations: true,
    ...config
  };

  return {
    announce: defaultConfig.announcements ? liveAnnouncer.announce : () => {},
    prefersHighContrast: colorContrast.prefersHighContrast(),
    prefersReducedMotion: motionPreferences.prefersReducedMotion(),
    screenReaderUtils: screenReader,
    keyboardUtils: keyboardNavigation,
    focusUtils: focusManagement
  };
};

// Accessibility testing utilities
export const a11yTesting = {
  // Check if element has accessible name
  hasAccessibleName: (element: HTMLElement): boolean => {
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    const textContent = element.textContent?.trim();
    const alt = element.getAttribute('alt');
    const title = element.getAttribute('title');

    return !!(ariaLabel || ariaLabelledBy || textContent || alt || title);
  },

  // Check if interactive element is keyboard accessible
  isKeyboardAccessible: (element: HTMLElement): boolean => {
    const tabIndex = element.getAttribute('tabindex');
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');

    const interactiveElements = ['a', 'button', 'input', 'select', 'textarea'];
    const interactiveRoles = ['button', 'link', 'tab', 'menuitem'];

    const isNativelyInteractive = interactiveElements.includes(tagName);
    const hasInteractiveRole = role && interactiveRoles.includes(role);
    const hasValidTabIndex = tabIndex === null || parseInt(tabIndex) >= 0;

    return (isNativelyInteractive || hasInteractiveRole) && hasValidTabIndex;
  },

  // Check color contrast (requires a color contrast library in real implementation)
  checkColorContrast: (foreground: string, background: string): 'pass' | 'fail' => {
    // Simplified implementation
    const contrast = colorContrast.calculateContrast(foreground, background);
    return contrast >= 4.5 ? 'pass' : 'fail';
  },

  // Generate accessibility report for an element
  generateA11yReport: (element: HTMLElement) => {
    return {
      hasAccessibleName: a11yTesting.hasAccessibleName(element),
      isKeyboardAccessible: a11yTesting.isKeyboardAccessible(element),
      hasProperRole: !!element.getAttribute('role') || !!element.tagName,
      hasAriaAttributes: Array.from(element.attributes).some(attr =>
        attr.name.startsWith('aria-')
      )
    };
  }
};

// Common accessible component patterns
export const accessiblePatterns = {
  // Skip link for keyboard navigation
  skipLink: {
    href: '#main-content',
    className: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded',
    children: 'Skip to main content'
  },

  // Loading spinner with accessibility
  loadingSpinner: (label = 'Loading') => ({
    role: 'status',
    'aria-label': label,
    'aria-live': 'polite'
  }),

  // Error message with accessibility
  errorMessage: (id: string) => ({
    id,
    role: 'alert',
    'aria-live': 'assertive',
    'aria-atomic': true
  }),

  // Success message with accessibility
  successMessage: (id: string) => ({
    id,
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': true
  }),

  // Modal dialog accessibility
  modal: (isOpen: boolean, titleId: string, descriptionId?: string) => ({
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': titleId,
    ...(descriptionId && { 'aria-describedby': descriptionId }),
    tabIndex: -1
  }),

  // Disclosure/accordion accessibility
  disclosure: (isExpanded: boolean, panelId: string) => ({
    'aria-expanded': isExpanded,
    'aria-controls': panelId
  }),

  // Tab accessibility
  tab: (isSelected: boolean, panelId: string) => ({
    role: 'tab',
    'aria-selected': isSelected,
    'aria-controls': panelId,
    tabIndex: isSelected ? 0 : -1
  }),

  // Tab panel accessibility
  tabPanel: (tabId: string, isSelected: boolean) => ({
    role: 'tabpanel',
    'aria-labelledby': tabId,
    tabIndex: 0,
    hidden: !isSelected
  })
};

const accessibilityUtils = {
  liveAnnouncer,
  keyboardNavigation,
  focusManagement,
  screenReader,
  colorContrast,
  motionPreferences,
  useAccessibility,
  a11yTesting,
  accessiblePatterns
};

export default accessibilityUtils;