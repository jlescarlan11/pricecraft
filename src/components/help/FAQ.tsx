import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Input } from '../shared/Input';

interface FAQItemProps {
  id: string;
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({
  id,
  question,
  answer,
  isOpen,
  onToggle,
}) => {
  return (
    <div
      id={id}
      className="border-b border-border-subtle last:border-0 scroll-mt-20"
    >
      <button
        onClick={onToggle}
        className="w-full py-4 flex items-center justify-between text-left focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] rounded-sm transition-colors hover:bg-surface/60 px-2 -mx-2 group"
        aria-expanded={isOpen}
      >
        <span
          className={`text-sm font-semibold transition-colors ${
            isOpen ? 'text-clay' : 'text-ink-900 group-hover:text-clay'
          }`}
        >
          {question}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-clay shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-ink-400 group-hover:text-clay shrink-0" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'max-h-[600px] opacity-100 mb-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-2 text-ink-700 leading-relaxed text-sm max-w-prose">
          {answer}
        </div>
      </div>
    </div>
  );
};

const FAQS = [
  {
    id: 'profit-margin',
    question: 'What’s a good profit margin for food products?',
    answer:
      "Aim for a profit margin of 30% or more to stay healthy. For example, if a snack costs ₱70 to make and you sell it for ₱100, you keep ₱30 as profit. This 30% helps pay for your bills and allows you to save for your business's future.",
  },
  {
    id: 'markup-vs-margin',
    question: 'What’s the difference between markup and margin?',
    answer:
      'Markup is added on top of your cost (e.g., a 50% markup on a ₱100 cost makes the price ₱150). Margin is the share of the selling price kept as profit (a 50% margin on a ₱100 price means ₱50 is profit). Choose whichever feels more natural — they will give different selling prices for the same cost.',
  },
  {
    id: 'include-labor',
    question: 'Should I include my own labor as a cost?',
    answer:
      "Yes — always pay yourself. Treat your time like any other expense. A reasonable hourly rate keeps your business sustainable and stops you from undercharging just to feel competitive.",
  },
  {
    id: 'overhead',
    question: 'What counts as overhead?',
    answer:
      'Overhead is the cost of running your business that doesn’t belong to a single product: utilities, rent, packaging, subscriptions, gas to deliver, depreciation on equipment, marketing. Allocate a per-batch share so each product carries its weight.',
  },
];

export const FAQ: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return FAQS;
    const q = searchQuery.toLowerCase();
    return FAQS.filter(
      (faq) =>
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleTocClick = (id: string) => {
    setOpenId(id);
    // Defer scroll until after render so the expanded section is in place.
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-8 max-w-5xl">
      {/* TOC */}
      <aside
        className="hidden lg:block sticky top-20 self-start"
        aria-label="Questions index"
      >
        <p className="label-caps mb-2 px-2">Questions</p>
        <ul className="space-y-0.5">
          {FAQS.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => handleTocClick(f.id)}
                className={`block w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors leading-snug ${
                  openId === f.id
                    ? 'bg-clay-50 text-clay-700 font-medium'
                    : 'text-ink-500 hover:bg-surface hover:text-ink-900'
                }`}
              >
                {f.question}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Content */}
      <div className="min-w-0 space-y-4">
        <div className="relative">
          <Input
            label="Search"
            hideLabel
            placeholder="Search questions or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none"
            aria-hidden="true"
          />
        </div>

        <div className="card divide-y divide-border-subtle">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => (
              <FAQItem
                key={faq.id}
                id={faq.id}
                question={faq.question}
                answer={faq.answer}
                isOpen={openId === faq.id}
                onToggle={() =>
                  setOpenId(openId === faq.id ? null : faq.id)
                }
              />
            ))
          ) : (
            <div className="py-10 px-4 text-center text-ink-500 text-sm">
              No match for &quot;{searchQuery}&quot;.
            </div>
          )}
        </div>

        <p className="text-xs text-ink-400 text-center pt-2">
          Still have questions? We&apos;re here to help you price with intention.
        </p>
      </div>
    </div>
  );
};
