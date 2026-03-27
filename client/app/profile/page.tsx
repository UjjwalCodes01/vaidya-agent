'use client';

import { AppLayout } from '@/components/layout';
import { Button } from '@/components/shared';
import { useToast } from '@/components/shared/Toast';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

export default function ProfilePage() {
  const { showToast } = useToast();
  const router = useRouter();
  const { user, logout, linkABHA, updatePreferences } = useAuth();
  const [isLinkingABHA, setIsLinkingABHA] = useState(false);
  const [abhaInput, setAbhaInput] = useState('');
  const [showABHADialog, setShowABHADialog] = useState(false);

  const handleEditProfile = () => {
    showToast('Opening profile editor...', 'info');
  };

  const handleLinkABHA = async () => {
    if (!abhaInput.trim()) {
      showToast('Please enter your ABHA address', 'error');
      return;
    }

    setIsLinkingABHA(true);
    try {
      await linkABHA(abhaInput.trim());
      showToast('ABHA linked successfully!', 'success');
      setShowABHADialog(false);
      setAbhaInput('');
    } catch (error) {
      // Error already shown by auth context
    } finally {
      setIsLinkingABHA(false);
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    updatePreferences({ language: newLanguage });
    showToast(`Language changed to ${newLanguage}`, 'success');
  };

  const handleManageConsents = () => {
    showToast('Opening consent management...', 'info');
    router.push('/records');
  };

  const handleViewAccessHistory = () => {
    showToast('Loading access history...', 'info');
    router.push('/records');
  };

  const handleDownloadData = () => {
    showToast('Preparing data export...', 'info');
    setTimeout(() => {
      showToast('Your data export is ready!', 'success');
    }, 2000);
  };

  const handleChangePassword = () => {
    showToast('Password change not available in demo mode', 'info');
  };

  const handleViewSessions = () => {
    showToast('Loading active sessions...', 'info');
  };

  const handleTerms = () => {
    showToast('Opening Terms of Service...', 'info');
  };

  const handlePrivacy = () => {
    showToast('Opening Privacy Policy...', 'info');
  };

  const handleHelp = () => {
    showToast('Opening Help & Support...', 'info');
  };

  const handleLogout = async () => {
    showToast('Logging out...', 'info');
    try {
      await logout();
      showToast('Logged out successfully', 'success');
      setTimeout(() => router.push('/'), 1000);
    } catch {
      showToast('Logout failed', 'error');
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      showToast('Account deletion requires email confirmation', 'warning');
    }
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* User Identity Card */}
        <div className="bg-gradient-to-br from-[var(--brand)] to-[var(--brand)]/80 text-white rounded-[24px] p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold backdrop-blur-sm">
              {user?.name ? getInitials(user.name) : '👤'}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user?.name || 'Guest User'}</h2>
              <p className="text-white/80">{user?.email || user?.userId || 'guest@vaidya.health'}</p>
              {user?.phone && (
                <p className="text-white/70 text-sm mt-1">📱 {user.phone}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleEditProfile}
            className="bg-white text-[var(--brand)] px-4 py-2 rounded-xl font-medium hover:bg-white/90 transition-colors"
          >
            Edit Profile
          </button>
        </div>

        {/* ABHA Account Management */}
        <Section title="ABHA Health ID" icon="🔗">
          {user?.abhaLinked ? (
            <>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-xl">✅</span>
                  <div>
                    <p className="font-medium text-[var(--foreground)] mb-1">
                      ABHA linked successfully
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {user.abhaAddress}
                    </p>
                    <p className="text-sm text-[var(--muted)] mt-2">
                      Your health records are now accessible across all ABDM-enabled facilities
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={() => router.push('/records')} className="w-full">
                Manage Health Records →
              </Button>
            </>
          ) : (
            <>
              <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="font-medium text-[var(--foreground)] mb-1">
                      ABHA not linked
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      Link your ABHA to access complete health records across all healthcare facilities
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={() => setShowABHADialog(true)} className="w-full">
                Link ABHA Account →
              </Button>
              <p className="text-xs text-[var(--muted)] mt-2">
                Enter your ABHA address (e.g., username@abdm)
              </p>
            </>
          )}
        </Section>

        {/* ABHA Linking Dialog */}
        {showABHADialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
              <h3 className="text-xl font-bold mb-4">Link ABHA Account</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    ABHA Address
                  </label>
                  <input
                    type="text"
                    value={abhaInput}
                    onChange={(e) => setAbhaInput(e.target.value)}
                    placeholder="username@abdm"
                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">
                    Example: john.doe@abdm or 91-1234-5678-9012@abdm
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowABHADialog(false)}
                    variant="secondary"
                    className="flex-1"
                    disabled={isLinkingABHA}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleLinkABHA}
                    className="flex-1"
                    disabled={isLinkingABHA || !abhaInput.trim()}
                  >
                    {isLinkingABHA ? 'Linking...' : 'Link ABHA'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Language & Region */}
        <Section title="Language & Region" icon="🌐">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Primary Language
              </label>
              <select
                value={user?.language || 'English'}
                onChange={handleLanguageChange}
                className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50"
              >
                <option value="English">English</option>
                <option value="Hindi">हिंदी (Hindi)</option>
                <option value="Kannada">ಕನ್ನಡ (Kannada)</option>
                <option value="Tamil">தமிழ் (Tamil)</option>
                <option value="Telugu">తెలుగు (Telugu)</option>
                <option value="Bengali">বাংলা (Bengali)</option>
                <option value="Marathi">मराठी (Marathi)</option>
                <option value="Gujarati">ગુજરાતી (Gujarati)</option>
                <option value="Punjabi">ਪੰਜਾਬੀ (Punjabi)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Region
              </label>
              <select className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50">
                <option>Delhi NCR</option>
                <option>Mumbai</option>
                <option>Bangalore</option>
                <option>Hyderabad</option>
                <option>Chennai</option>
                <option>Kolkata</option>
                <option>Pune</option>
                <option>Other</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon="🔔">
          <div className="space-y-3">
            <Toggle 
              label="Health alerts & local outbreaks" 
              description="Get notified about disease outbreaks in your region"
              defaultChecked={true}
            />
            <Toggle 
              label="Appointment reminders" 
              description="Reminders 1 day before scheduled appointments"
              defaultChecked={true}
            />
            <Toggle 
              label="Medication reminders" 
              description="Alerts for prescription refills and doses"
              defaultChecked={false}
            />
            <Toggle 
              label="Triage follow-ups" 
              description="Check-in messages after triage sessions"
              defaultChecked={true}
            />
          </div>
        </Section>

        {/* Privacy & Consent */}
        <Section title="Privacy & Consent" icon="🔐">
          <div className="space-y-3">
            <SettingsButton onClick={handleManageConsents}>
              Manage consent settings
            </SettingsButton>
            
            <SettingsButton onClick={handleViewAccessHistory}>
              View data access history
            </SettingsButton>
            
            <SettingsButton onClick={handleDownloadData} icon="📥">
              Download my data
            </SettingsButton>
          </div>
        </Section>

        {/* Accessibility */}
        <Section title="Accessibility" icon="♿">
          <div className="space-y-3">
            <Toggle 
              label="Large text" 
              description="Increase font size for better readability"
              defaultChecked={false}
            />
            <Toggle 
              label="High contrast mode" 
              description="Enhance visual contrast for visibility"
              defaultChecked={false}
            />
            <Toggle 
              label="Screen reader support" 
              description="Optimize for screen reader navigation"
              defaultChecked={false}
            />
            <Toggle 
              label="Reduce animations" 
              description="Minimize motion for sensitive users"
              defaultChecked={false}
            />
          </div>
        </Section>

        {/* Security */}
        <Section title="Security" icon="🔒">
          <div className="space-y-3">
            <SettingsButton onClick={handleChangePassword}>
              Change password
            </SettingsButton>
            
            <SettingsButton onClick={handleViewSessions}>
              Active sessions
            </SettingsButton>
          </div>
        </Section>

        {/* About */}
        <Section title="About" icon="ℹ️">
          <div className="space-y-2 text-sm text-[var(--muted)]">
            <p><strong className="text-[var(--foreground)]">Version:</strong> 1.0.0</p>
            <p><strong className="text-[var(--foreground)]">Build:</strong> March 2026</p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button onClick={handleTerms} className="text-[var(--brand)] hover:underline">Terms of Service</button>
              <button onClick={handlePrivacy} className="text-[var(--brand)] hover:underline">Privacy Policy</button>
              <button onClick={handleHelp} className="text-[var(--brand)] hover:underline">Help & Support</button>
            </div>
          </div>
        </Section>

        {/* Logout */}
        <Button variant="danger" className="w-full" onClick={handleLogout} icon={<span>🚪</span>}>
          Logout
        </Button>

        {/* Danger Zone */}
        <div className="border-2 border-[var(--danger)]/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--danger)] mb-2">Danger Zone</h3>
          <button 
            onClick={handleDeleteAccount}
            className="text-sm text-[var(--danger)] hover:underline"
          >
            Delete my account permanently
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface-strong)] rounded-xl p-6 border border-[var(--border)]">
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function SettingsButton({ children, onClick, icon }: { 
  children: React.ReactNode; 
  onClick: () => void;
  icon?: string;
}) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] px-4 py-3 rounded-xl hover:bg-[var(--brand-soft)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50"
    >
      <span className="font-medium text-[var(--foreground)]">{children}</span>
      <span>{icon || '→'}</span>
    </button>
  );
}

function Toggle({ label, description, defaultChecked }: { 
  label: string; 
  description?: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked ?? false);

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="font-medium text-[var(--foreground)]">{label}</p>
        {description && (
          <p className="text-sm text-[var(--muted)]">{description}</p>
        )}
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50 focus:ring-offset-2
          ${checked ? 'bg-[var(--brand)]' : 'bg-[var(--border)]'}
        `}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}
