import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/courses/CourseCard';
import { coursesApi } from '@/lib/api/courses';

export function FeaturedCoursesSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: courses, isLoading } = useQuery({
    queryKey: ['featured-courses'],
    queryFn: () => coursesApi.getFeaturedCourses(),
  });

  if (isLoading) {
    return (
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              {t('home.featuredCoursesTitle')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('home.featuredCoursesSubtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-[400px] rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!courses || courses.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">
            {t('home.featuredCoursesTitle')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('home.featuredCoursesSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/courses')}
            className="group"
          >
            {t('home.ctaButton')}
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
}
