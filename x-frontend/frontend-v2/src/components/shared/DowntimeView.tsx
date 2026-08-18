/**
 * DowntimeView Component
 * Displays a maintenance/downtime page when the 'downtime' feature flag is enabled
 */

import React, { useEffect } from 'react';

export const DowntimeView: React.FC = () => {
  useEffect(() => {
    // Auto-refresh every 30 seconds to check if site is back
    const refreshTimer = setTimeout(() => {
      window.location.reload();
    }, 30000);

    return () => clearTimeout(refreshTimer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-white/10 rounded-full blur-3xl animate-blob top-0 -left-20"></div>
        <div className="absolute w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-blob animation-delay-2000 top-0 -right-20"></div>
        <div className="absolute w-96 h-96 bg-pink-300/20 rounded-full blur-3xl animate-blob animation-delay-4000 bottom-0 left-1/2"></div>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 md:p-12 text-center animate-fadeIn relative z-10">
        {/* Logo with pulse animation */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center animate-pulse-slow shadow-xl">
          <span className="text-white text-4xl font-bold">L</span>
        </div>

        {/* Title with gradient text */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
          🎉 Something Awesome is Coming! 🎉
        </h1>

        {/* Engaging Message */}
        <p className="text-xl text-gray-700 mb-6 font-medium">
          We're cooking up something <span className="text-purple-600 font-bold">incredible</span> for you!
        </p>

        {/* Highlight Box with animation */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-6 border-2 border-purple-200 animate-bounce-slow">
          <p className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent mb-2">
            ✨ Amazing New Features Incoming! ✨
          </p>
          <p className="text-gray-600 text-sm">
            Enhanced learning experience • Better performance • Cool surprises
          </p>
        </div>

        {/* Feature Teasers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-purple-100 rounded-xl p-4 transform hover:scale-105 transition-transform">
            <div className="text-3xl mb-2">🚀</div>
            <p className="text-sm font-semibold text-purple-800">Faster & Smoother</p>
          </div>
          <div className="bg-pink-100 rounded-xl p-4 transform hover:scale-105 transition-transform">
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-sm font-semibold text-pink-800">Smarter Testing</p>
          </div>
          <div className="bg-indigo-100 rounded-xl p-4 transform hover:scale-105 transition-transform">
            <div className="text-3xl mb-2">✨</div>
            <p className="text-sm font-semibold text-indigo-800">Fresh UI</p>
          </div>
        </div>

        {/* Countdown style message */}

        {/* Languages with hover effect */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white px-6 py-3 rounded-full font-semibold shadow-lg transform hover:scale-110 transition-transform">
            �🇪 German - Goethe
          </div>
          <div className="bg-gradient-to-br from-pink-600 to-pink-800 text-white px-6 py-3 rounded-full font-semibold shadow-lg transform hover:scale-110 transition-transform">
            �🇫🇷 French - DELF
          </div>
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white px-6 py-3 rounded-full font-semibold shadow-lg transform hover:scale-110 transition-transform">
            🇪🇸 Spanish - DELE
          </div>
        </div>

        {/* Countdown style message */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 mb-6 text-white">
          <p className="text-2xl font-bold mb-2">⏰ We'll Be Back Soon!</p>
          <p className="text-lg">Grab a coffee, we'll be ready in a few hours</p>
          <p className="text-sm mt-2 opacity-90">This page auto-refreshes - no need to hit reload! 🔄</p>
        </div>

        {/* Animated Spinner */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-pink-600 rounded-full animate-spin-reverse"></div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-8 shadow-inner">
          <div className="h-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 animate-progress-wave"></div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200">
          <p className="text-gray-700 mb-3 text-lg font-semibold">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">lingali</span> - Your CEFR Excellence Platform
          </p>
          <div className="space-y-2">
            <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
              <span className="text-lg">🔐</span>
              <strong>Your session stays active</strong> - no need to log back in!
            </p>
            <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
              <span className="text-lg">💾</span>
              All your progress is safe and sound
            </p>
            <p className="text-sm text-purple-600 font-semibold mt-4">
              Thank you for your patience - you're going to love this! �
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        @keyframes progress-wave {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.7);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(147, 51, 234, 0);
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes spin-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-progress-wave {
          animation: progress-wave 1.5s ease-in-out infinite;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-spin-reverse {
          animation: spin-reverse 1s linear infinite;
        }
      `}</style>
    </div>
  );
};
