import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, Users, BookOpen } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Course } from '@/types/course';
import { useLanguageStore } from '@/store/languageStore';
import { useCartStore } from '@/store/cartStore';

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currency } = useLanguageStore();
  const { addItem, isInCart } = useCartStore();

  const price =
    currency === 'USD'
      ? course.price_usd
      : currency === 'EGP'
      ? course.price_egp
      : course.price_sek;

  const currencySymbol = currency === 'USD' ? '$' : currency === 'EGP' ? 'EGP' : 'SEK';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInCart(course.id)) {
      addItem(course);
    }
  };

  const handleCardClick = () => {
    navigate(`/courses/${course.slug}`);
  };

  return (
    <Card
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-blue-500 to-purple-600">
            <BookOpen className="h-16 w-16 text-white opacity-50" />
          </div>
        )}

        {/* Level badge */}
        <Badge className="absolute top-2 left-2 capitalize">
          {t(`courses.levels.${course.level}`)}
        </Badge>

        {course.is_featured && (
          <Badge className="absolute top-2 right-2 bg-yellow-500 hover:bg-yellow-600">
            Featured
          </Badge>
        )}
      </div>

      <CardHeader>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {course.description}
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {/* Rating */}
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{course.rating.toFixed(1)}</span>
          </div>

          {/* Duration */}
          {course.duration_hours && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{course.duration_hours}h</span>
            </div>
          )}

          {/* Students */}
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{course.total_students.toLocaleString()}</span>
          </div>
        </div>

        {/* Category & Format */}
        <div className="flex gap-2 mt-3">
          {course.category && (
            <Badge variant="outline" className="text-xs">
              {course.category}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs capitalize">
            {t(`courses.formats.${course.format}`)}
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-0">
        <div className="text-2xl font-bold">
          {currencySymbol} {price?.toFixed(2)}
        </div>
        <Button
          size="sm"
          onClick={handleAddToCart}
          disabled={isInCart(course.id)}
        >
          {isInCart(course.id) ? 'In Cart' : t('courses.card.addToCart')}
        </Button>
      </CardFooter>
    </Card>
  );
}
