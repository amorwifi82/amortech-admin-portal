# Changelog

All notable changes to this project will be documented in this file.

## [v1.0.1] - 2024-03-21

### Changed
- Updated debt payment functionality to allow custom payment amounts instead of fixed percentages
- Enhanced payment recording UI with a dedicated dialog for entering payment amounts
- Improved status updates to automatically mark debts as "Paid" when full amount is received
- Added validation to prevent payment amounts exceeding the total debt
- Added loading states and better error handling for payment processing

## [v1.0.0] - Initial Release

### Added
- Initial release of the Amortech Admin Portal
- Client management functionality
- Debt tracking and management
- Payment recording system
- Real-time updates using Supabase subscriptions 