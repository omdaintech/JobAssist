import { useTranslation } from 'react-i18next';
import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const testimonials = [
  {
    id: 1,
    name: 'Ahmed Hassan',
    role: 'Marketing Manager',
    company: 'Tech Corp Egypt',
    country: 'Egypt',
    avatar: '',
    rating: 5,
    text: 'Xpand Learning helped me transition from traditional marketing to AI-powered digital marketing. The courses are practical and designed for non-techies like me!',
  },
  {
    id: 2,
    name: 'Sara Andersson',
    role: 'HR Specialist',
    company: 'Innovation AB',
    country: 'Sweden',
    avatar: '',
    rating: 5,
    text: 'The data literacy course transformed how I approach HR analytics. Now I can make data-driven decisions without needing a technical background.',
  },
  {
    id: 3,
    name: 'Fatima Al-Rashid',
    role: 'Business Analyst',
    company: 'Gulf Enterprises',
    country: 'UAE',
    avatar: '',
    rating: 5,
    text: 'As someone without coding experience, I was hesitant. But Xpand made AI accessible and practical. I got promoted within 3 months of completing the program!',
  },
];

export function TestimonialsSection() {
  const { t } = useTranslation();

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">
            {t('home.testimonialsTitle')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('home.testimonialsSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="relative overflow-hidden">
              <CardContent className="pt-6">
                <Quote className="h-8 w-8 text-primary/20 mb-4" />

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>

                {/* Testimonial text */}
                <p className="text-sm text-muted-foreground mb-6 line-clamp-4">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={testimonial.avatar} />
                    <AvatarFallback>
                      {testimonial.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-sm">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {testimonial.role} • {testimonial.company}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {testimonial.country}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
