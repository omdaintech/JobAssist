import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CourseCard } from '@/components/courses/CourseCard';
import { CourseFilters } from '@/components/courses/CourseFilters';
import { coursesApi } from '@/lib/api/courses';
import type { CourseFilters as Filters } from '@/types/course';

export default function Courses() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<Filters>({});

  useEffect(() => {
    document.title = 'Courses - Xpand Learning';
  }, []);

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses', filters],
    queryFn: () => coursesApi.getCourses(filters),
  });

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Page Header */}
        <section className="py-12 bg-muted/50">
          <div className="container">
            <h1 className="text-4xl font-bold mb-4">{t('courses.title')}</h1>
            <p className="text-lg text-muted-foreground">
              Explore our comprehensive courses designed for non-technical professionals
            </p>
          </div>
        </section>

        {/* Courses Grid with Filters */}
        <section className="py-12">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Filters Sidebar */}
              <aside className="lg:col-span-1">
                <div className="lg:sticky lg:top-24">
                  <CourseFilters
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    onClear={handleClearFilters}
                  />
                </div>
              </aside>

              {/* Courses Grid */}
              <div className="lg:col-span-3">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="h-[400px] rounded-lg bg-muted animate-pulse"
                      />
                    ))}
                  </div>
                ) : courses && courses.length > 0 ? (
                  <>
                    <div className="mb-6">
                      <p className="text-sm text-muted-foreground">
                        {courses.length} {courses.length === 1 ? 'course' : 'courses'} found
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {courses.map((course) => (
                        <CourseCard key={course.id} course={course} />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <p className="text-lg text-muted-foreground">
                      {t('courses.noResults')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
