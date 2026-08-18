import {
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  Bars3Icon,
  BuildingOfficeIcon,
  ChatBubbleBottomCenterTextIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CurrencyEuroIcon,
  DocumentTextIcon,
  HomeIcon,
  KeyIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { AdminPasswordChangeModal } from './ui'

export default function AdminLayout() {
    const { logout, token } = useAdminAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const [passwordChangeOpen, setPasswordChangeOpen] = useState(false)

    const isActive = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(path + '/')
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const toggleSidebarCollapse = () => {
        setSidebarCollapsed(!sidebarCollapsed)
    }

    // Close user menu when location changes
    useEffect(() => {
        setUserMenuOpen(false)
    }, [location.pathname])

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
        { name: 'Institute Management', href: '/institutes', icon: BuildingOfficeIcon },
        { name: 'Question Dashboard', href: '/questions', icon: QuestionMarkCircleIcon },
        { name: 'Prompt Management', href: '/prompt-management', icon: DocumentTextIcon },
        { name: 'Pricing & Policy', href: '/pricing-policy', icon: CurrencyEuroIcon },
        { name: 'Payment Management', href: '/payments', icon: BanknotesIcon },
        { name: 'Messages', href: '/messages', icon: ChatBubbleBottomCenterTextIcon },
    ]

    return (
        <div className="h-screen flex overflow-hidden bg-gray-100">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 flex z-40 md:hidden">
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
                    <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
                        <div className="absolute top-0 right-0 -mr-12 pt-2">
                            <button
                                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <XMarkIcon className="h-6 w-6 text-white" />
                            </button>
                        </div>
                        <SidebarContent
                            navigation={navigation}
                            isActive={isActive}
                            handleLogout={handleLogout}
                            collapsed={false}
                            isMobile={true}
                            onNavigate={() => setSidebarOpen(false)}
                        />
                    </div>
                </div>
            )}

            {/* Static sidebar for desktop */}
            <div className="hidden md:flex md:flex-shrink-0">
                <div className={`flex flex-col transition-all duration-300 ease-in-out ${
                    sidebarCollapsed ? 'w-16' : 'w-64'
                }`}>
                    <SidebarContent
                        navigation={navigation}
                        isActive={isActive}
                        handleLogout={handleLogout}
                        collapsed={sidebarCollapsed}
                        toggleCollapse={toggleSidebarCollapse}
                        isMobile={false}
                    />
                </div>
            </div>

            {/* Main content */}
            <div className="flex flex-col w-0 flex-1 overflow-hidden">
                {/* Top navigation */}
                <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
                    <button
                        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-eu-blue md:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Bars3Icon className="h-6 w-6" />
                    </button>

                    <div className="flex-1 px-4 flex justify-between items-center">
                        <div className="flex-1 flex">
                            <h1 className="text-xl font-semibold text-gray-900">
                                {getPageTitle(location.pathname)}
                            </h1>
                        </div>

                        <div className="ml-4 flex items-center md:ml-6">
                            {/* Admin User Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-eu-blue rounded-md px-3 py-2"
                                >
                                    <span className="text-sm font-medium">System Administrator</span>
                                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {userMenuOpen && (
                                    <>
                                        {/* Backdrop */}
                                        <div 
                                            className="fixed inset-0 z-10"
                                            onClick={() => setUserMenuOpen(false)}
                                        />
                                        
                                        {/* Menu */}
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                                            <div className="py-1">
                                                <button
                                                    onClick={() => {
                                                        setUserMenuOpen(false)
                                                        setPasswordChangeOpen(true)
                                                    }}
                                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                >
                                                    <KeyIcon className="h-4 w-4" />
                                                    Change Password
                                                </button>
                                                <hr className="border-gray-200" />
                                                <button
                                                    onClick={() => {
                                                        setUserMenuOpen(false)
                                                        handleLogout()
                                                    }}
                                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                >
                                                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                                    Logout
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="flex-1 relative overflow-y-auto focus:outline-none">
                    <div className="py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>

            {/* Password Change Modal */}
            <AdminPasswordChangeModal
                isOpen={passwordChangeOpen}
                onClose={() => setPasswordChangeOpen(false)}
                token={token || ''}
            />
        </div>
    )
}

function SidebarContent({
    navigation,
    isActive,
    handleLogout,
    collapsed = false,
    toggleCollapse,
    isMobile = false,
    onNavigate
}: {
    navigation: any[]
    isActive: (path: string) => boolean
    handleLogout: () => void
    collapsed?: boolean
    toggleCollapse?: () => void
    isMobile?: boolean
    onNavigate?: () => void
}) {
    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
            {/* Logo/Header */}
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-eu-blue relative">
                {!collapsed && (
                    <div className="flex items-center space-x-3">
                        <img src="/logos/lingali-logo.png" alt="lingali Logo" className="h-8 w-8 object-contain" />
                        <h1 className="text-xl font-bold text-white transition-opacity duration-300">
                            lingali
                        </h1>
                    </div>
                )}
                {collapsed && (
                    <div className="flex items-center justify-center w-full">
                        <img src="/logos/lingali-logo.png" alt="lingali Logo" className="h-8 w-8 object-contain" />
                    </div>
                )}

                {/* Collapse toggle button for desktop */}
                {!isMobile && toggleCollapse && (
                    <button
                        onClick={toggleCollapse}
                        className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-full p-1 shadow-md hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-eu-blue z-10"
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? (
                            <ChevronRightIcon className="h-4 w-4 text-gray-600" />
                        ) : (
                            <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
                        )}
                    </button>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                <nav className="mt-5 flex-1 px-2 space-y-1">
                    {navigation.map((item) => {
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => onNavigate?.()}
                                className={`
                                    group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200
                                    ${collapsed ? 'justify-center' : ''}
                                    ${isActive(item.href)
                                        ? 'bg-eu-blue text-white'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                `}
                                title={collapsed ? item.name : undefined}
                            >
                                <Icon
                                    className={`
                                        flex-shrink-0 h-6 w-6 transition-all duration-200
                                        ${collapsed ? '' : 'mr-3'}
                                        ${isActive(item.href)
                                            ? 'text-white'
                                            : 'text-gray-400 group-hover:text-gray-500'
                                        }
                                    `}
                                />
                                {!collapsed && (
                                    <span className="transition-opacity duration-300">
                                        {item.name}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Logout button */}
                <div className="flex-shrink-0 px-2 pb-2">
                    <button
                        onClick={handleLogout}
                        className={`
                            group flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-all duration-200
                            ${collapsed ? 'justify-center' : ''}
                        `}
                        title={collapsed ? 'Logout' : undefined}
                    >
                        <ArrowRightOnRectangleIcon
                            className={`
                                flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-500 transition-all duration-200
                                ${collapsed ? '' : 'mr-3'}
                            `}
                        />
                        {!collapsed && (
                            <span className="transition-opacity duration-300">
                                Logout
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

function getPageTitle(pathname: string): string {
    if (pathname === '/dashboard') return 'Dashboard'
    if (pathname === '/institutes') return 'Institute Management'
    if (pathname === '/questions') return 'Questions Dashboard'
    if (pathname.startsWith('/questions/')) return 'Question Management'
    if (pathname === '/prompt-management') return 'Prompt Management'
    if (pathname === '/pricing-policy') return 'Pricing & Policy'
    if (pathname === '/payments') return 'Payment Management'
    if (pathname === '/messages') return 'Messages Management'
    return 'Admin Panel'
}
