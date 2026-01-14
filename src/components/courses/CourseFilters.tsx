import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import type { CourseFilters as Filters, CourseLevel, CourseFormat } from '@/types/course';

interface CourseFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onClear: () => void;
}

const categories = [
  'ai-basics',
  'data-literacy',
  'automation',
  'digital-marketing',
  'productivity',
];

const levels: CourseLevel[] = ['beginner', 'intermediate', 'advanced'];
const formats: CourseFormat[] = ['self-paced', 'live', 'hybrid'];

export function CourseFilters({ filters, onFiltersChange, onClear }: CourseFiltersProps) {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState(filters.search || '');

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    onFiltersChange({ ...filters, search: value });
  };

  const handleLevelToggle = (level: CourseLevel) => {
    const currentLevels = filters.level || [];
    const newLevels = currentLevels.includes(level)
      ? currentLevels.filter((l) => l !== level)
      : [...currentLevels, level];
    onFiltersChange({ ...filters, level: newLevels });
  };

  const handleCategoryToggle = (category: string) => {
    const currentCategories = filters.category || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter((c) => c !== category)
      : [...currentCategories, category];
    onFiltersChange({ ...filters, category: newCategories });
  };

  const handleFormatToggle = (format: CourseFormat) => {
    const currentFormats = filters.format || [];
    const newFormats = currentFormats.includes(format)
      ? currentFormats.filter((f) => f !== format)
      : [...currentFormats, format];
    onFiltersChange({ ...filters, format: newFormats });
  };

  const hasActiveFilters =
    (filters.level && filters.level.length > 0) ||
    (filters.category && filters.category.length > 0) ||
    (filters.format && filters.format.length > 0) ||
    filters.search;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Levels */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">{t('courses.filters.level')}</h4>
        <div className="space-y-2">
          {levels.map((level) => (
            <div key={level} className="flex items-center space-x-2">
              <Checkbox
                id={`level-${level}`}
                checked={filters.level?.includes(level)}
                onCheckedChange={() => handleLevelToggle(level)}
              />
              <Label
                htmlFor={`level-${level}`}
                className="text-sm font-normal cursor-pointer capitalize"
              >
                {t(`courses.levels.${level}`)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">{t('courses.filters.category')}</h4>
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category}`}
                checked={filters.category?.includes(category)}
                onCheckedChange={() => handleCategoryToggle(category)}
              />
              <Label
                htmlFor={`category-${category}`}
                className="text-sm font-normal cursor-pointer"
              >
                {t(`courses.categories.${category}`)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Formats */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">{t('courses.filters.format')}</h4>
        <div className="space-y-2">
          {formats.map((format) => (
            <div key={format} className="flex items-center space-x-2">
              <Checkbox
                id={`format-${format}`}
                checked={filters.format?.includes(format)}
                onCheckedChange={() => handleFormatToggle(format)}
              />
              <Label
                htmlFor={`format-${format}`}
                className="text-sm font-normal cursor-pointer capitalize"
              >
                {t(`courses.formats.${format}`)}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('courses.filters.search')}
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{t('courses.filters.apply')}</h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4 mr-1" />
              {t('courses.filters.clear')}
            </Button>
          )}
        </div>
        <FilterContent />
      </div>

      {/* Mobile Filters */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              {t('common.filter')}
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {(filters.level?.length || 0) +
                    (filters.category?.length || 0) +
                    (filters.format?.length || 0)}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{t('courses.filters.apply')}</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
              {hasActiveFilters && (
                <Button variant="outline" className="w-full mt-6" onClick={onClear}>
                  <X className="h-4 w-4 mr-1" />
                  {t('courses.filters.clear')}
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.level?.map((level) => (
            <Badge
              key={level}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleLevelToggle(level)}
            >
              {t(`courses.levels.${level}`)}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          {filters.category?.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleCategoryToggle(category)}
            >
              {t(`courses.categories.${category}`)}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          {filters.format?.map((format) => (
            <Badge
              key={format}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleFormatToggle(format)}
            >
              {t(`courses.formats.${format}`)}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
