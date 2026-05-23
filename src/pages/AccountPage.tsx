import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, PageHeader } from '../components/shared';
import { ExportButton } from '../components/account/ExportButton';
import { ImportButton } from '../components/account/ImportButton';
import { DangerZone } from '../components/account/DangerZone';
import { ChangePasswordModal } from '../components/account/ChangePasswordModal';

export const AccountPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Account"
        description="Manage your profile and data."
      />

      {/* Profile Section */}
      <section className="card p-6">
        <h2 className="text-xl font-medium text-ink-900 mb-md">Profile</h2>
        <div className="mb-xl">
          <p className="text-ink-700">
            <span className="font-medium">Email:</span> {user?.email}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-md">
          <Button variant="secondary" onClick={() => setIsPasswordModalOpen(true)}>
            Change Password
          </Button>
          <Button
            variant="ghost"
            className="text-ink-700 hover:text-rust hover:bg-rust/5 justify-start sm:justify-center"
            onClick={() => signOut()}
          >
            Sign Out
          </Button>
        </div>
      </section>

      {/* Data Management Section */}
      <section className="card p-6">
        <h2 className="text-xl font-medium text-ink-900 mb-md">Data Management</h2>
        <p className="text-ink-500 mb-xl">
          Export your data for safekeeping or transfer it to another device.
        </p>

        <div className="flex flex-col sm:flex-row gap-md">
          <ExportButton />
          <ImportButton />
        </div>
      </section>

      {/* Danger Zone */}
      <DangerZone />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};
