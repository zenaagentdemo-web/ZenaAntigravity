/**
 * Types for navigation state when moving between Deal Detail and other pages.
 */

export interface DealNavigationState {
    from?: 'deal-detail';
    dealId?: string;
    propertyName?: string;
    targetDate?: string; // ISO string for calendar navigation
    label?: string; // For the back button label
}
