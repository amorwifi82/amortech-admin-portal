export const APP_VERSION = '1.0.2';

export const CHANGELOG = [
  {
    version: '1.0.2',
    date: '2024-03-22',
    changes: [
      'Fixed settings page initialization and persistence',
      'Improved error handling for settings management',
      'Enhanced database schema for settings table',
      'Added better type safety for settings data',
      'Fixed version column synchronization issues'
    ]
  },
  {
    version: '1.0.1',
    date: '2024-03-20',
    changes: [
      'Initial debt management system',
      'Basic client management',
      'Payment tracking',
      'Reminder system implementation'
    ]
  }
];

export const getVersionInfo = () => {
  return {
    currentVersion: APP_VERSION,
    changelog: CHANGELOG,
    lastUpdated: CHANGELOG[0].date
  };
};

// Database schema version (for future migrations)
export const DB_VERSION = '1.0.0';

// Feature flags
export const FEATURES = {
  enableWhatsAppReminders: true,
  enableSMSReminders: true,
  enablePartialPayments: true,
  enableBulkReminders: false, // Coming in future update
  enablePaymentHistory: true,
  enableDebtHistory: true
}; 