import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import { HamburgerMenu } from '@/components/ui/hamburger-menu';
import { useAuth } from '@/context/AuthContext';
import { useBrandConfig } from '@/utils/brand-manager';
import { headerVariants } from '@/utils/animations';

import { PageContainer } from './PageContainer';

export const AppHeader: React.FC = () => {
  const { isAuthenticated, isInitialized } = useAuth();
  const navigate = useNavigate();
  const brandConfig = useBrandConfig();

  // Use brand configuration for logo text
  const logoText = brandConfig?.logoText || 'One-CEFR';

  return (
    <motion.header 
      className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 pt-safe"
      variants={headerVariants}
      initial="hidden"
      animate="visible"
    >
      <PageContainer className="flex items-center justify-between h-16 min-h-[64px]">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-4">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <img
              src="/logos/lingali-logo.png"
              alt="One-CEFR Logo"
              className="h-8 w-8 object-contain"
            />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900 brand-text">
                {logoText}
              </span>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                beta
              </span>
            </div>
          </Link>
        </div>

        {/* User Actions */}
        <div className="flex items-center space-x-2">
          {/* Desktop Login Button - only show for unauthenticated users on desktop */}
          {!isAuthenticated && isInitialized && (
            <div className="hidden md:block">
              <Button
                onClick={() => navigate('/login')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 min-h-[44px] text-sm font-medium shadow-sm"
              >
                Login
              </Button>
            </div>
          )}

          {/* Hamburger Menu - Only show when authenticated */}
          {isAuthenticated && <HamburgerMenu />}
        </div>
      </PageContainer>
    </motion.header>
  );
};
