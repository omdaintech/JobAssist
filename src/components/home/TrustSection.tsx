import { useTranslation } from 'react-i18next';

// Placeholder logos - replace with actual partner logos
const partners = [
  { name: 'Partner 1', logo: '' },
  { name: 'Partner 2', logo: '' },
  { name: 'Partner 3', logo: '' },
  { name: 'Partner 4', logo: '' },
  { name: 'Partner 5', logo: '' },
  { name: 'Partner 6', logo: '' },
];

export function TrustSection() {
  const { t } = useTranslation();

  return (
    <section className="py-12 md:py-16 bg-muted/30">
      <div className="container">
        <h3 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-8">
          {t('home.trustTitle')}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
          {partners.map((partner, index) => (
            <div
              key={index}
              className="flex items-center justify-center h-12 grayscale hover:grayscale-0 transition-all"
            >
              {partner.logo ? (
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="h-10 w-24 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                  {partner.name}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
