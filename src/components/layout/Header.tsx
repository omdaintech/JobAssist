import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authService } from '@/lib/supabase/auth';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function Header() {
  const { t } = useTranslation();
  const { user, clearAuth } = useAuthStore();
  const { items } = useCartStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.signOut();
    clearAuth();
    navigate('/');
  };

  const cartItemsCount = items.length;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-purple-600" />
          <span className="text-xl font-bold">Xpand Learning</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            to="/"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/courses"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            {t('nav.courses')}
          </Link>
          <Link
            to="/about"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            {t('nav.about')}
          </Link>
          <Link
            to="/blog"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            {t('nav.blog')}
          </Link>
          <Link
            to="/contact"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            {t('nav.contact')}
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-4">
          <LanguageSwitcher />

          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate('/cart')}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartItemsCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {cartItemsCount}
              </span>
            )}
          </Button>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  {t('nav.dashboard')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                {t('nav.login')}
              </Button>
              <Button onClick={() => navigate('/signup')}>
                {t('nav.signup')}
              </Button>
            </div>
          )}

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col space-y-4 mt-8">
                <Link
                  to="/"
                  className="text-lg font-medium transition-colors hover:text-primary"
                >
                  {t('nav.home')}
                </Link>
                <Link
                  to="/courses"
                  className="text-lg font-medium transition-colors hover:text-primary"
                >
                  {t('nav.courses')}
                </Link>
                <Link
                  to="/about"
                  className="text-lg font-medium transition-colors hover:text-primary"
                >
                  {t('nav.about')}
                </Link>
                <Link
                  to="/blog"
                  className="text-lg font-medium transition-colors hover:text-primary"
                >
                  {t('nav.blog')}
                </Link>
                <Link
                  to="/contact"
                  className="text-lg font-medium transition-colors hover:text-primary"
                >
                  {t('nav.contact')}
                </Link>
                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="text-lg font-medium transition-colors hover:text-primary"
                    >
                      {t('nav.dashboard')}
                    </Link>
                    <Button variant="outline" onClick={handleLogout}>
                      {t('nav.logout')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => navigate('/login')}>
                      {t('nav.login')}
                    </Button>
                    <Button onClick={() => navigate('/signup')}>
                      {t('nav.signup')}
                    </Button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

// Default export for backward compatibility with old JobAssist pages
export default Header;
