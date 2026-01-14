import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";
import "@/lib/i18n/config"; // Initialize i18n

// Old pages (JobAssist)
import Index from "./pages/Index";
import Jobs from "./pages/Jobs";
import Resume from "./pages/Resume";
import Interview from "./pages/Interview";

// Xpand Learning pages
import Home from "./pages/xpand/Home";
import Courses from "./pages/xpand/Courses";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const { setUser, setProfile, setIsLoading } = useAuthStore();

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Fetch user profile if logged in
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setIsLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Xpand Learning Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:slug" element={<div>Course Detail - Coming Soon</div>} />
            <Route path="/about" element={<div>About Page - Coming Soon</div>} />
            <Route path="/blog" element={<div>Blog Page - Coming Soon</div>} />
            <Route path="/contact" element={<div>Contact Page - Coming Soon</div>} />
            <Route path="/cart" element={<div>Cart Page - Coming Soon</div>} />
            <Route path="/dashboard" element={<div>Dashboard - Coming Soon</div>} />
            <Route path="/login" element={<div>Login Page - Coming Soon</div>} />
            <Route path="/signup" element={<div>Signup Page - Coming Soon</div>} />

            {/* Old JobAssist Routes (keep for reference) */}
            <Route path="/jobassist" element={<Index />} />
            <Route path="/jobassist/jobs" element={<Jobs />} />
            <Route path="/jobassist/resume" element={<Resume />} />
            <Route path="/jobassist/interview" element={<Interview />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
