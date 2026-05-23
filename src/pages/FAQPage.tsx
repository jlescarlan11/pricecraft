import React from 'react';
import { FAQ } from '../components/help/FAQ';
import { PageHeader } from '../components/shared';

export const FAQPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        eyebrow="Learn"
        title="Pricing tips & FAQ"
        description="Expert guidance for sustainable business growth."
      />
      <FAQ />
    </div>
  );
};
