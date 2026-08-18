import { useAuth } from '@/context/AuthContext';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { usePWAInstall } from '@/hooks/usePWA';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { Avatar } from './avatar';
import { Button } from './button';

interface HamburgerMenuProps {
    className?: string;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { isAuthenticated, user, logout, usageInfo } = useAuth();
    const { logout: firebaseLogout } = useFirebaseAuth();
    const { isInstallable, isInstalled, promptInstall, canPrompt, isIOS, isSafari } = usePWAInstall();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            // Coordinate both logout functions
            await Promise.all([
                logout(), // Traditional auth logout
                firebaseLogout() // Firebase auth logout
            ]);
            setIsOpen(false);
            navigate('/');
        } catch (error) {
            console.error('Logout error:', error);
            // Navigate anyway
            setIsOpen(false);
            navigate('/');
        }
    };

    const closeMenu = () => setIsOpen(false);

    const handleInstallApp = async () => {
        if (canPrompt) {
            const installed = await promptInstall();
            if (installed) {
                closeMenu();
            }
        } else if (isIOS && isSafari) {
            // Show iOS instructions in an alert
            alert('To install:\n1. Tap the Share button (square with arrow)\n2. Scroll and tap "Add to Home Screen"\n3. Tap "Add" to confirm');
        }
    };

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/exam', label: 'Exams', icon: '📝' },
        { path: '/practice', label: 'Practice', icon: '📚' },
        { path: '/practice-log', label: 'Activity Log', icon: '📋' },
        { path: '/consumption-history', label: 'Credit History', icon: '💰' },
        { path: '/buy-credits', label: 'Buy Credits', icon: '💳' },
        { path: '/settings', label: 'Profile', icon: '⚙️' },
        { path: '/feedback', label: 'Feedback', icon: '💬' },
    ];

    const staticLinks: { href: string; label: string; icon: string; isRoute?: boolean }[] = [
        { href: '/faq', label: 'Help & FAQ', icon: '❓', isRoute: true },
        // Contact removed from hamburger menu per design
    ];

    return (
        <div className={`relative ${className}`}>
            {/* Hamburger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-eu-blue focus:ring-offset-2 transition-colors"
                aria-label="Open menu"
            >
                <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                    <span
                        className={`block h-0.5 w-6 bg-current transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-1.5' : ''
                            }`}
                    />
                    <span
                        className={`block h-0.5 w-6 bg-current transition-all duration-300 ${isOpen ? 'opacity-0' : ''
                            }`}
                    />
                    <span
                        className={`block h-0.5 w-6 bg-current transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-1.5' : ''
                            }`}
                    />
                </div>
            </button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={closeMenu}
                />
            )}

            {/* Menu Panel */}
            <div
                className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <img 
                            src="/logos/lingali-logo.png" 
                            alt="Lingali Logo" 
                            className="h-8 w-8 object-contain"
                        />
                        <span className="text-lg font-bold text-gray-900">Menu</span>
                    </div>
                    <button
                        onClick={closeMenu}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        aria-label="Close menu"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* User Info */}
                {isAuthenticated && user && (
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center space-x-3">
                            <Avatar size="md">
                                <span className="text-sm">
                                    {user.email?.charAt(0).toUpperCase()}
                                </span>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {user.email}
                                </p>
                                {usageInfo && (
                                    <p className="text-xs text-gray-500">
                                        {usageInfo.remaining_count} questions remaining
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="space-y-1 px-4">
                        {/* App Routes */}
                        {menuItems.map((item) => {
                            // Define which pages require authentication for full functionality
                            const requiresAuth = ['/exam', '/practice', '/dashboard', '/practice-log', '/settings', '/consumption-history'].includes(item.path);
                            const isDisabled = !isAuthenticated && requiresAuth;

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={closeMenu}
                                    className={`flex items-center justify-between px-3 py-3 rounded-lg transition-colors ${isDisabled
                                        ? 'text-gray-500 hover:bg-gray-50 hover:text-gray-600'
                                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="text-lg">{item.icon}</span>
                                        <span className="text-sm font-medium">{item.label}</span>
                                    </div>
                                </Link>
                            );
                        })}

                        {/* Static Links - Divider */}
                        <div className="border-t border-gray-200 my-3"></div>

                        {/* PWA Install Option - Only show if not installed */}
                        {!isInstalled && (isInstallable || (isIOS && isSafari)) && (
                            <button
                                onClick={handleInstallApp}
                                className="w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors text-eu-blue hover:bg-blue-50 hover:text-eu-blue-700"
                            >
                                <div className="flex items-center space-x-3">
                                    <Download className="w-5 h-5" />
                                    <span className="text-sm font-medium">Install App</span>
                                </div>
                                <span className="text-xs bg-blue-100 text-eu-blue px-2 py-0.5 rounded-full">
                                    Recommended
                                </span>
                            </button>
                        )}

                        {/* Static Content Links */}
                        {staticLinks.map((item) => (
                            item.isRoute ? (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    onClick={closeMenu}
                                    className="flex items-center justify-between px-3 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="text-lg">{item.icon}</span>
                                        <span className="text-sm font-medium">{item.label}</span>
                                    </div>
                                </Link>
                            ) : (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    onClick={closeMenu}
                                    className="flex items-center justify-between px-3 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="text-lg">{item.icon}</span>
                                        <span className="text-sm font-medium">{item.label}</span>
                                    </div>
                                </a>
                            )
                        ))}
                    </nav>

                    {/* Sign In Section for unauthenticated users */}
                    {!isAuthenticated && (
                        <div className="px-4 mt-6 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600 mb-4">
                                <strong>👆 Explore what's available!</strong><br />
                                Sign in to unlock full functionality
                            </p>
                            <Button
                                onClick={() => {
                                    navigate('/login');
                                    closeMenu();
                                }}
                                className="w-full bg-eu-blue hover:bg-eu-blue-700 text-white"
                            >
                                Sign In to Get Started
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {isAuthenticated && (
                    <div className="border-t border-gray-200 p-4">
                        <Button
                            onClick={handleLogout}
                            variant="outline"
                            className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        >
                            Sign Out
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
