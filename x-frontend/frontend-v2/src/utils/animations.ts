// Page transition variants
export const pageVariants = {
  initial: { 
    opacity: 0, 
    x: -20,
    scale: 0.98
  },
  in: { 
    opacity: 1, 
    x: 0,
    scale: 1
  },
  out: { 
    opacity: 0, 
    x: 20,
    scale: 0.98
  }
};

export const pageTransition = {
  type: 'tween' as const,
  ease: 'anticipate' as const,
  duration: 0.3
};

// Card animation variants
export const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: "easeOut" as const
    }
  })
};

// Button interaction variants
export const buttonVariants = {
  hover: { 
    scale: 1.02,
    transition: { 
      type: 'spring' as const, 
      stiffness: 400, 
      damping: 17 
    }
  },
  tap: { 
    scale: 0.98,
    transition: { 
      type: 'spring' as const, 
      stiffness: 400, 
      damping: 17 
    }
  }
};

// Header slide animation
export const headerVariants = {
  hidden: { y: -100 },
  visible: { 
    y: 0,
    transition: { 
      type: 'spring' as const, 
      stiffness: 300, 
      damping: 30 
    }
  }
};

// Stagger children animation
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

// Loading spinner animation
export const spinnerVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear" as const
    }
  }
};

// Slide in from bottom (for mobile nav)
export const slideUpVariants = {
  hidden: { 
    y: 100, 
    opacity: 0 
  },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30
    }
  }
};
