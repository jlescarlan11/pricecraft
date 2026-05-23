import React, { useState } from 'react';
import { ChefHat, BookOpen, ScanLine, ChevronRight } from 'lucide-react';
import { Modal, Button } from '../shared';
import { useSettings } from '../../context/SettingsContext';

const STEPS = [
  {
    icon: ChefHat,
    title: 'Welcome to PriceCraft',
    body: 'A calm tool to help you price your food product profitably. List your ingredients, your time, and overhead — we do the math.',
  },
  {
    icon: BookOpen,
    title: 'Build your ingredient catalog',
    body: 'Save the ingredients you buy regularly with their prices. Recipes will autofill from your catalog, and you can update everything by scanning a receipt.',
  },
  {
    icon: ScanLine,
    title: 'Scan receipts to stay current',
    body: 'Snap a photo of any grocery receipt. We read it in your browser — no upload, no fees — and keep your catalog and recipes in sync.',
  },
];

export const OnboardingTour: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const [open, setOpen] = useState(!settings.onboardingCompleted);
  const [step, setStep] = useState(0);

  if (settings.onboardingCompleted) return null;

  const finish = () => {
    updateSettings({ onboardingCompleted: true });
    setOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const Icon = STEPS[step].icon;

  return (
    <Modal
      isOpen={open}
      onClose={finish}
      title={STEPS[step].title}
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="flex gap-xs">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === step ? 'bg-clay' : 'bg-border-base'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-sm">
            <Button variant="ghost" onClick={finish}>
              Skip
            </Button>
            <Button variant="primary" onClick={next}>
              {step < STEPS.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-xs" aria-hidden="true" />
                </>
              ) : (
                'Get started'
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center py-md">
        <div className="p-md bg-clay/10 rounded-full mb-md">
          <Icon className="w-8 h-8 text-clay" aria-hidden="true" />
        </div>
        <p className="text-ink-700 leading-relaxed max-w-md">{STEPS[step].body}</p>
      </div>
    </Modal>
  );
};
