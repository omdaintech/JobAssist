import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { XpandHero } from '@/components/home/XpandHero';
import { FeaturedCoursesSection } from '@/components/home/FeaturedCourseSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { TrustSection } from '@/components/home/TrustSection';

export default function Home() {
  useEffect(() => {
    document.title = 'Xpand Learning - AI & Tech Skills for Non-Techies';
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <XpandHero />
        <TrustSection />
        <FeaturedCoursesSection />
        <TestimonialsSection />

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">
          <div className="container text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Start Your Learning Journey?
            </h2>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
              Join thousands of professionals upskilling in AI and tech across Egypt, Sweden, and MENA
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-white text-primary font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                Browse All Courses
              </button>
              <button className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white text-white font-semibold rounded-lg hover:bg-white/20 transition-colors">
                Contact Us
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
