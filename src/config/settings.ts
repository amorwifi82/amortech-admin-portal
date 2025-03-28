export const APP_VERSION = '1.0.2';

export const CHANGELOG = [
  {
    version: '1.0.2',
    date: '2024-03-21',
    changes: [
      'Added version tracking in settings',
      'Improved debt management with filtered view (only showing clients with debt)',
      'Enhanced payment tracking system',
      'Added WhatsApp and SMS templates for payment reminders',
      'Improved UI/UX for debt recording and payment collection',
      'Fixed bug with debt accumulation for existing clients'
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