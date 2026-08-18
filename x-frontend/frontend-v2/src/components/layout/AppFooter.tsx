import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

import { PageContainer } from './PageContainer';

export const AppFooter: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  const isExamRoute = () => {
    return location.pathname === '/exam' || location.pathname.startsWith('/exam/');
  };

  // Show mobile navigation only when authenticated
  const showMobileNav = user;

  useEffect(() => {
    if (!showMobileNav) return; // No need to track scroll if nav isn't shown

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          // Show footer when scrolling up, hide when scrolling down
          if (currentScrollY < lastScrollY || currentScrollY < 50) {
            // Scrolling up or near the top
            setIsVisible(true);
          } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
            // Scrolling down and past threshold
            setIsVisible(false);
          }

          setLastScrollY(currentScrollY);
          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY, showMobileNav]);

  return (
    <>
      {/* Mobile Navigation - Fixed at bottom on mobile with scroll animation */}
      {showMobileNav && (
        <div 
          className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 pb-safe transition-transform duration-300 ease-in-out ${
            isVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <PageContainer className="py-1.5">
            <nav className="flex items-center justify-between gap-2">
            <Link
              to="/exam"
              className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors min-h-[44px] justify-center rounded-lg ${
                user && isExamRoute()
                  ? 'text-eu-blue bg-eu-blue/5'
                  : user
                    ? 'text-gray-600 hover:text-eu-blue hover:bg-gray-100'
                    : 'text-gray-500 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">📝</span>
              <span className="text-xs font-medium">Exams</span>
            </Link>
            <Link
              to="/practice"
              className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors min-h-[44px] justify-center rounded-lg ${
                user && isActiveRoute('/practice')
                  ? 'text-eu-blue bg-eu-blue/5'
                  : user
                    ? 'text-gray-600 hover:text-eu-blue hover:bg-gray-100'
                    : 'text-gray-500 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">📚</span>
              <span className="text-xs font-medium">Practice</span>
            </Link>
            <Link
              to="/dashboard"
              className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors min-h-[44px] justify-center rounded-lg ${
                user && isActiveRoute('/dashboard')
                  ? 'text-eu-blue bg-eu-blue/5'
                  : user
                    ? 'text-gray-600 hover:text-eu-blue hover:bg-gray-100'
                    : 'text-gray-500 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">📊</span>
              <span className="text-xs font-medium">Dashboard</span>
            </Link>
            <Link
              to="/practice-log"
              className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors min-h-[44px] justify-center rounded-lg ${
                user && isActiveRoute('/practice-log')
                  ? 'text-eu-blue bg-eu-blue/5'
                  : user
                    ? 'text-gray-600 hover:text-eu-blue hover:bg-gray-100'
                    : 'text-gray-500 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">📋</span>
              <span className="text-xs font-medium">History</span>
            </Link>
            <Link
              to="/feedback"
              className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors min-h-[44px] justify-center rounded-lg ${
                user && isActiveRoute('/feedback')
                  ? 'text-eu-blue bg-eu-blue/5'
                  : user
                    ? 'text-gray-600 hover:text-eu-blue hover:bg-gray-100'
                    : 'text-gray-500 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">💬</span>
              <span className="text-xs font-medium">Feedback</span>
            </Link>
            {/* Contact removed from mobile nav */}
          </nav>
          </PageContainer>
        </div>
      )}

      {/* Regular Footer Content - Add bottom padding for mobile nav */}
      <footer className={`bg-white border-t border-gray-200 mt-auto py-2 ${showMobileNav ? 'mb-16 md:mb-0' : ''}`}>
        <PageContainer>
          <div className="text-center">
            <p className="text-gray-500 text-[11px]">
              © 2026 One-CEFR. CEFR-aligned assessment, honest feedback.
            </p>
          </div>
        </PageContainer>
      </footer>
    </>
  );
}; 