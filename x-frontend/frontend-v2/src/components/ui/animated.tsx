import { motion } from 'framer-motion';
import { Button as BaseButton } from './button';
import { Card as BaseCard } from './card';
import { buttonVariants, cardVariants } from '@/utils/animations';

// Animated Button
export const AnimatedButton = motion(BaseButton);

// Animated Card with default variants
export const AnimatedCard = motion(BaseCard);

// Pre-configured animated components
export const MotionButton = motion.create(BaseButton);
export const MotionCard = motion.create(BaseCard);

// Enhanced Button with hover/tap animations
export const InteractiveButton: React.FC<React.ComponentProps<typeof BaseButton>> = (props) => {
  return (
    <AnimatedButton
      variants={buttonVariants}
      whileHover="hover"
      whileTap="tap"
      {...props}
    />
  );
};

// Enhanced Card with entrance animation
export const AnimatedCardWithEntrance: React.FC<React.ComponentProps<typeof BaseCard> & { index?: number }> = ({ 
  index = 0, 
  ...props 
}) => {
  return (
    <AnimatedCard
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      {...props}
    />
  );
};
