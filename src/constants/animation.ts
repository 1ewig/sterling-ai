/**
 * Centralized Framer Motion Animation Variants & Spring Profiles
 * 
 * Enforces smooth, soft, and subtle animations across:
 * - Work process timeline accordion (AgentProcessTimeline)
 * - Thought reasoning accordion (AgentThoughtAccordion)
 * - Tool invocation detail drawers (ToolResultCard drawer)
 * - Empty chat state staggered cascade (ChatClient)
 */

import type { Variants } from 'framer-motion';

/**
 * Architectural deceleration cubic bezier curve.
 * Starts smoothly and settles gently into place without bounce or jitter.
 */
export const EASING_ARCHITECTURAL = [0.16, 1, 0.3, 1] as const;

/**
 * Smooth, jitter-free height and opacity collapse/expand variants for:
 * 1. Overarching work process timeline group
 * 2. Dedicated agent thought accordion
 * 3. Nested tool execution detail drawers
 */
export const accordionVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.22, ease: EASING_ARCHITECTURAL },
      opacity: { duration: 0.16, ease: 'easeOut' },
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: 0.26, ease: EASING_ARCHITECTURAL },
      opacity: { duration: 0.2, delay: 0.02, ease: 'easeIn' },
    },
  },
};

/**
 * Soft, subtle entrance and exit animation for popover dropdown menus
 * Uses a gentle scale (0.98 -> 1) and 6px vertical translation anchored to transform-origin top-right.
 */
export const dropdownMenuVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.98,
    y: -6,
    transition: {
      duration: 0.16,
      ease: 'easeOut',
    },
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: EASING_ARCHITECTURAL,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: -4,
    transition: {
      duration: 0.14,
      ease: 'easeIn',
    },
  },
};

/**
 * Subtle staggered container for the empty chat suggestions interface.
 */
export const emptyStateContainerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: EASING_ARCHITECTURAL,
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

/**
 * Smooth entrance fade-in animation for the empty state background luminous glow.
 */
export const emptyStateGlowVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: EASING_ARCHITECTURAL,
    },
  },
};

/**
 * Gentle vertical entry for individual empty-state suggestion items.
 */
export const emptyStateItemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: EASING_ARCHITECTURAL,
    },
  },
};

/**
 * Smooth backdrop fade and modal scale variants for confirm dialogs.
 */
export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.14, ease: 'easeIn' },
  },
};

export const modalContentVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 8,
    transition: { duration: 0.16, ease: 'easeOut' },
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.22, ease: EASING_ARCHITECTURAL },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 6,
    transition: { duration: 0.14, ease: 'easeIn' },
  },
};

/**
 * Tactile touch and press feedback configurations for interactive buttons, icons, and accordions.
 * Provides immediate physical responsiveness across mouse clicks and mobile touch interactions.
 */
export const tapScaleButton = {
  scale: 0.94,
  transition: { duration: 0.1, ease: 'easeOut' },
} as const;

export const tapScaleIcon = {
  scale: 0.88,
  transition: { duration: 0.08, ease: 'easeOut' },
} as const;

export const tapScaleAccordion = {
  scale: 0.98,
  transition: { duration: 0.1, ease: 'easeOut' },
} as const;

export const tapScalePill = {
  scale: 0.96,
  transition: { duration: 0.1, ease: 'easeOut' },
} as const;

export const hoverLiftPill = {
  y: -1,
  transition: { duration: 0.15, ease: 'easeOut' },
} as const;

export const hoverLiftCard = {
  y: -1,
  transition: { duration: 0.15, ease: 'easeOut' },
} as const;

export const tapScaleCard = {
  scale: 0.98,
  transition: { duration: 0.1, ease: 'easeOut' },
} as const;

export const hoverScaleIcon = {
  scale: 1.05,
  transition: { duration: 0.12, ease: 'easeOut' },
} as const;

/**
 * Buttery smooth 60/120fps easing parameters for Left Sidebar width collapse and expansion.
 * Uses architectural cubic-bezier deceleration for fluid, zero-jitter transitions.
 */
export const sidebarTransition = {
  duration: 0.28,
  ease: EASING_ARCHITECTURAL,
} as const;

export const sidebarSpringTransition = sidebarTransition;

export const pillSpringTransition = {
  type: 'spring',
  stiffness: 450,
  damping: 32,
} as const;

export const sidebarContentVariants: Variants = {
  collapsed: {
    opacity: 0,
    transition: { duration: 0.12, ease: 'easeOut' },
  },
  expanded: {
    opacity: 1,
    transition: { duration: 0.22, delay: 0.06, ease: EASING_ARCHITECTURAL },
  },
};

/**
 * Clean width and opacity collapse for sidebar item labels and action containers.
 * Fades opacity out quickly on collapse to prevent text squishing, and fades in gently on expand.
 */
export const sidebarHorizontalCollapseVariants: Variants = {
  collapsed: {
    opacity: 0,
    width: 0,
    transition: {
      width: { duration: 0.26, ease: EASING_ARCHITECTURAL },
      opacity: { duration: 0.12, ease: 'easeOut' },
    },
    transitionEnd: {
      display: 'none',
    },
  },
  expanded: {
    display: 'flex',
    opacity: 1,
    width: 'auto',
    transition: {
      width: { duration: 0.28, ease: EASING_ARCHITECTURAL },
      opacity: { duration: 0.2, delay: 0.06, ease: EASING_ARCHITECTURAL },
    },
  },
};

/**
 * Height and margin collapse for sidebar group section headings.
 */
export const sidebarHeadingCollapseVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    marginBottom: 0,
    transition: {
      height: { duration: 0.22, ease: EASING_ARCHITECTURAL },
      opacity: { duration: 0.1, ease: 'easeOut' },
      marginBottom: { duration: 0.22, ease: EASING_ARCHITECTURAL },
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    marginBottom: 4,
    transition: {
      height: { duration: 0.26, ease: EASING_ARCHITECTURAL },
      opacity: { duration: 0.18, delay: 0.04, ease: EASING_ARCHITECTURAL },
      marginBottom: { duration: 0.26, ease: EASING_ARCHITECTURAL },
    },
  },
};

/**
 * Smooth entrance animation for chat message bubbles and active drafting indicators.
 */
export const messageEntranceVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: EASING_ARCHITECTURAL },
  },
};

export const draftIndicatorVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: EASING_ARCHITECTURAL },
  },
};

/**
 * Icon swap transition for AnimatePresence mode="wait" (e.g. send/stop button).
 */
export const iconSwapVariants: Variants = {
  initial: { scale: 0.6, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { duration: 0.15 } },
  exit: { scale: 0.6, opacity: 0, transition: { duration: 0.15 } },
};


