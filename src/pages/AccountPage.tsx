import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, PageHeader } from '../components/shared';
import { ExportButton } from '../components/account/ExportButton';
import { ImportButton } from '../components/account/ImportButton';
import { DangerZone } from '../components/account/DangerZone';
import { ChangePasswordModal } from '../components/account/ChangePasswordModal';

const NAV = [
  { id: 'profile', label: 'Profile' },
  { id: 'data', label: 'Data management' },
  { id: 'danger', label: 'Danger zone' },
];

export const AccountPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        description="Manage your profile and data."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-8 max-w-4xl">
        {/* Section nav */}
        <nav
          className="hidden lg:block sticky top-20 self-start"
          aria-label="Account sections"
        >
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="block px-3 py-1.5 rounded-md text-sm text-ink-500 hover:text-ink-900 hover:bg-surface transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sections */}
        <div className="space-y-6 min-w-0">
          <section id="profile" className="card p-6 scroll-mt-20">
            <header className="mb-4">
              <h2 className="text-base font-semibold text-ink-900">Profile</h2>
              <p className="text-sm text-ink-500 mt-0.5">
                Your sign-in details.
              </p>
            </header>

            <dl className="text-sm border-t border-border-subtle pt-4">
              <div className="flex items-baseline gap-3">
                <dt className="w-20 text-ink-500">Email</dt>
                <dd className="text-ink-900 font-medium">{user?.email}</dd>
              </div>
            </dl>

            <div className="mt-5 pt-4 border-t border-border-subtle flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => setIsPasswordModalOpen(true)}
              >
                Change password
              </Button>
              <Button
                variant="ghost"
                className="text-ink-700 hover:text-rust-700 hover:bg-rust-50"
                onClick={() => signOut()}
              >
                Sign out
              </Button>
            </div>
          </section>

          <section id="data" className="card p-6 scroll-mt-20">
            <header className="mb-4">
              <h2 className="text-base font-semibold text-ink-900">
                Data management
              </h2>
              <p className="text-sm text-ink-500 mt-0.5">
                Export your data for safekeeping or transfer it to another
                device.
              </p>
            </header>

            <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-4">
              <ExportButton />
              <ImportButton />
            </div>
          </section>

          <section id="danger" className="scroll-mt-20">
            <DangerZone />
          </section>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};
