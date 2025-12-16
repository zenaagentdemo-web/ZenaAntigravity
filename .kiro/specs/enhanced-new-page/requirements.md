# Requirements Document

## Introduction

This specification defines the requirements for upgrading the "New" page (formerly "Focus" page) in the Zena AI Real Estate PWA. The New page displays email threads requiring the agent's reply and serves as a critical workflow hub for busy real estate agents. This upgrade transforms the existing functional but basic interface into a high-tech, AI-powered command center that matches the established Zena dashboard aesthetic featuring glassmorphism, neon accents, ambient animations, and intelligent features that help agents quickly triage and respond to communications.

## Glossary

- **New_Page_System**: The frontend page component that displays and manages email threads requiring user response
- **Thread_Card**: An individual glassmorphism card displaying a single email thread with its metadata, AI insights, and actions
- **Priority_Score**: An AI-calculated numeric value (0-100) determining thread display order based on urgency, risk, and business value
- **Urgency_Indicator**: A visual element showing time-sensitivity using animated neon accents and color-coded status
- **AI_Summary**: A concise, AI-generated synopsis of thread content and recommended action
- **Quick_Action_Button**: An interactive button with glow effects enabling single-tap thread operations
- **Swipe_Gesture**: A touch-based horizontal drag interaction for mobile thread actions
- **Filter_Chip**: A selectable glassmorphism pill for filtering threads by classification or status
- **Batch_Action_Mode**: A multi-select state enabling operations on multiple threads simultaneously
- **Thread_Preview_Panel**: An expandable section showing additional thread details without navigation
- **Shimmer_Skeleton**: An animated loading placeholder with gradient shimmer effect
- **Ambient_Background**: The animated particle/gradient background layer providing depth

## Requirements

### Requirement 1: High-Tech Visual Theme Consistency

**User Story:** As a real estate agent, I want the New page to match the stunning high-tech dashboard aesthetic, so that I have a cohesive, premium experience throughout the app.

#### Acceptance Criteria

1. WHEN the New_Page_System loads THEN the New_Page_System SHALL display a deep dark background (#0A0A0F to #1A1A2E gradient) with the ambient particle animation layer
2. WHEN Thread_Cards render THEN the New_Page_System SHALL apply glassmorphism styling with rgba(255,255,255,0.05) background, 20px backdrop blur, and 1px rgba(255,255,255,0.1) border
3. WHEN Thread_Cards render THEN the New_Page_System SHALL display a top gradient accent line using linear-gradient(90deg, transparent, var(--neon-cyan), transparent)
4. WHEN a user hovers over a Thread_Card THEN the New_Page_System SHALL animate the card with translateY(-4px) lift, intensified border glow (rgba(0,212,255,0.3)), and box-shadow expansion within 300ms
5. WHEN displaying text content THEN the New_Page_System SHALL use the high-tech text color hierarchy: primary (#FFFFFF), secondary (rgba(255,255,255,0.7)), tertiary (rgba(255,255,255,0.5))
6. WHEN displaying interactive elements THEN the New_Page_System SHALL apply neon cyan (#00D4FF) as the primary accent color with appropriate glow effects

### Requirement 2: Intelligent Thread Prioritization

**User Story:** As a busy real estate agent, I want threads automatically sorted by importance, so that I can focus on the most critical communications first.

#### Acceptance Criteria

1. WHEN threads load THEN the New_Page_System SHALL calculate a Priority_Score for each thread based on risk level (40% weight), days since last message (30% weight), and classification business value (30% weight)
2. WHEN displaying threads THEN the New_Page_System SHALL sort threads in descending Priority_Score order by default
3. WHEN a thread has high risk level THEN the New_Page_System SHALL display an animated pulsing Urgency_Indicator with red (#FF4444) glow effect
4. WHEN a thread has medium risk level THEN the New_Page_System SHALL display an Urgency_Indicator with amber (#FFAA00) glow effect
5. WHEN a thread exceeds 48 hours without response THEN the New_Page_System SHALL display a "Response Overdue" badge with urgent styling
6. WHEN Priority_Score calculation completes THEN the New_Page_System SHALL persist the sort order until user explicitly changes it

### Requirement 3: Enhanced Thread Card Display

**User Story:** As a real estate agent, I want to see rich, scannable information on each thread card, so that I can quickly understand context without opening the full thread.

#### Acceptance Criteria

1. WHEN rendering a Thread_Card THEN the New_Page_System SHALL display: classification badge, risk indicator, subject line, participant names, AI_Summary preview (max 2 lines), and relative timestamp
2. WHEN a thread has a draft response THEN the New_Page_System SHALL display a glowing cyan indicator badge with "Draft Ready" text
3. WHEN rendering participant information THEN the New_Page_System SHALL show up to 3 participant names with a "+N more" indicator for additional participants
4. WHEN a thread is linked to a property THEN the New_Page_System SHALL display a property badge with the address and a subtle property icon
5. WHEN a thread is linked to a deal THEN the New_Page_System SHALL display a deal stage indicator with appropriate status color
6. WHEN rendering the AI_Summary THEN the New_Page_System SHALL truncate text with ellipsis and provide expand capability on tap

### Requirement 4: Quick Actions with Visual Feedback

**User Story:** As a real estate agent, I want to perform common actions quickly with satisfying visual feedback, so that I can efficiently manage my inbox.

#### Acceptance Criteria

1. WHEN a user taps "View & Edit" THEN the New_Page_System SHALL navigate to the thread detail page with a smooth page transition animation
2. WHEN a user taps "Snooze" THEN the New_Page_System SHALL display a time picker overlay with preset options (1 hour, 4 hours, Tomorrow, Next Week) styled with glassmorphism
3. WHEN a user confirms snooze THEN the New_Page_System SHALL animate the Thread_Card sliding out with a fade effect and remove it from the list
4. WHEN a user taps "Send Draft" THEN the New_Page_System SHALL display a sending animation with a pulsing cyan glow, then show success feedback with a green checkmark animation
5. WHEN an action completes successfully THEN the New_Page_System SHALL display a brief toast notification with glassmorphism styling
6. IF an action fails THEN the New_Page_System SHALL display an error toast with red accent and retry option

### Requirement 5: Mobile Swipe Gestures

**User Story:** As a real estate agent using my phone, I want to swipe threads for quick actions, so that I can manage my inbox efficiently on mobile.

#### Acceptance Criteria

1. WHEN a user swipes a Thread_Card left beyond 80px threshold THEN the New_Page_System SHALL reveal a snooze action indicator with amber background gradient
2. WHEN a user swipes a Thread_Card right beyond 80px threshold THEN the New_Page_System SHALL reveal a view action indicator with cyan background gradient
3. WHEN a user releases a swipe beyond threshold THEN the New_Page_System SHALL execute the corresponding action with haptic feedback (if supported)
4. WHEN a user swipes but releases before threshold THEN the New_Page_System SHALL animate the card back to original position with spring easing
5. WHILE a user is actively swiping THEN the New_Page_System SHALL display the action indicator opacity proportional to swipe distance
6. WHEN swipe gestures are active THEN the New_Page_System SHALL prevent vertical scroll interference

### Requirement 6: Smart Filtering and Search

**User Story:** As a real estate agent, I want to filter and search my threads, so that I can find specific communications quickly.

#### Acceptance Criteria

1. WHEN the New_Page_System loads THEN the New_Page_System SHALL display Filter_Chips for: All, Buyers, Vendors, Market, Lawyers/Brokers, High Risk
2. WHEN a user taps a Filter_Chip THEN the New_Page_System SHALL apply the filter with a smooth list transition animation and update the chip to active state with cyan glow
3. WHEN multiple Filter_Chips are selected THEN the New_Page_System SHALL apply AND logic and display active count badge
4. WHEN a user taps the search icon THEN the New_Page_System SHALL expand a search input field with glassmorphism styling and auto-focus
5. WHEN a user types in search THEN the New_Page_System SHALL filter threads by subject, participant name, or summary content with 300ms debounce
6. WHEN search results update THEN the New_Page_System SHALL animate thread list changes with staggered fade transitions

### Requirement 7: Batch Operations Mode

**User Story:** As a real estate agent, I want to perform actions on multiple threads at once, so that I can efficiently manage bulk communications.

#### Acceptance Criteria

1. WHEN a user long-presses a Thread_Card THEN the New_Page_System SHALL enter Batch_Action_Mode with selection checkboxes appearing on all cards
2. WHEN in Batch_Action_Mode THEN the New_Page_System SHALL display a floating action bar at the bottom with batch action buttons (Snooze All, Archive All, Mark Read)
3. WHEN a user taps a Thread_Card in Batch_Action_Mode THEN the New_Page_System SHALL toggle selection with a cyan border highlight animation
4. WHEN threads are selected THEN the New_Page_System SHALL display selection count in the action bar with animated counter
5. WHEN a user taps outside cards or presses cancel THEN the New_Page_System SHALL exit Batch_Action_Mode with smooth transition
6. WHEN a batch action completes THEN the New_Page_System SHALL animate all affected cards simultaneously and exit Batch_Action_Mode

### Requirement 8: Real-Time Updates and Sync

**User Story:** As a real estate agent, I want my thread list to stay current without manual refresh, so that I never miss important communications.

#### Acceptance Criteria

1. WHEN new threads arrive THEN the New_Page_System SHALL display a "New threads available" banner with pulse animation at the top of the list
2. WHEN a user taps the new threads banner THEN the New_Page_System SHALL smoothly insert new Thread_Cards at appropriate priority positions with slide-down animation
3. WHEN a thread is updated externally THEN the New_Page_System SHALL update the Thread_Card content with a subtle highlight flash
4. WHEN sync is in progress THEN the New_Page_System SHALL display a subtle sync indicator in the header with rotating icon
5. WHEN the user pulls down on the list THEN the New_Page_System SHALL trigger a manual refresh with pull-to-refresh animation
6. IF sync fails THEN the New_Page_System SHALL display an offline indicator and queue actions for retry

### Requirement 9: Loading and Empty States

**User Story:** As a real estate agent, I want polished loading and empty states, so that the app feels premium even when waiting or when there's no data.

#### Acceptance Criteria

1. WHEN threads are loading THEN the New_Page_System SHALL display 3-5 Shimmer_Skeleton cards with animated gradient sweep effect
2. WHEN no threads require response THEN the New_Page_System SHALL display an animated empty state with the Zena avatar in "idle" state and congratulatory message
3. WHEN an error occurs during load THEN the New_Page_System SHALL display an error state with glassmorphism card, error icon, message, and retry button with glow effect
4. WHEN transitioning from loading to loaded THEN the New_Page_System SHALL animate Thread_Cards appearing with staggered fade-in (50ms delay between cards)
5. WHEN the empty state displays THEN the New_Page_System SHALL show subtle particle animations around the Zena avatar

### Requirement 10: Accessibility and Performance

**User Story:** As a real estate agent, I want the New page to be fast and accessible, so that I can use it effectively regardless of device or ability.

#### Acceptance Criteria

1. WHEN the user has prefers-reduced-motion enabled THEN the New_Page_System SHALL disable all non-essential animations while maintaining functionality
2. WHEN rendering Thread_Cards THEN the New_Page_System SHALL ensure all interactive elements have minimum 44x44px touch targets
3. WHEN displaying text THEN the New_Page_System SHALL maintain WCAG AA contrast ratio (4.5:1 minimum) against dark backgrounds
4. WHEN the thread list exceeds 20 items THEN the New_Page_System SHALL implement virtual scrolling to maintain 60fps scroll performance
5. WHEN focus moves between elements THEN the New_Page_System SHALL display visible focus indicators with cyan glow outline
6. WHEN screen reader is active THEN the New_Page_System SHALL provide appropriate ARIA labels for all interactive elements and status indicators

### Requirement 11: Thread Preview Expansion

**User Story:** As a real estate agent, I want to preview more thread details without leaving the list, so that I can make quick decisions about how to respond.

#### Acceptance Criteria

1. WHEN a user taps the expand icon on a Thread_Card THEN the New_Page_System SHALL smoothly expand the card to reveal the Thread_Preview_Panel
2. WHEN the Thread_Preview_Panel expands THEN the New_Page_System SHALL display: full AI summary, last 2 message previews, linked contacts, and suggested response options
3. WHEN the Thread_Preview_Panel is expanded THEN the New_Page_System SHALL collapse other expanded cards to maintain list readability
4. WHEN displaying message previews THEN the New_Page_System SHALL show sender avatar, name, timestamp, and truncated message content
5. WHEN a user taps outside an expanded card THEN the New_Page_System SHALL collapse the Thread_Preview_Panel with smooth animation
6. WHEN the Thread_Preview_Panel displays suggested responses THEN the New_Page_System SHALL show up to 3 AI-generated quick reply options as tappable chips

### Requirement 12: Header and Navigation Enhancement

**User Story:** As a real estate agent, I want a clear, informative header that helps me understand my inbox status at a glance.

#### Acceptance Criteria

1. WHEN the New_Page_System loads THEN the New_Page_System SHALL display a header with "New" title in gradient text (cyan to purple) with subtle text glow
2. WHEN threads are loaded THEN the New_Page_System SHALL display thread count with breakdown by urgency level using color-coded mini badges
3. WHEN the refresh button is tapped THEN the New_Page_System SHALL animate the button with rotation and trigger data refresh
4. WHEN displaying the header THEN the New_Page_System SHALL apply glassmorphism blur effect that intensifies on scroll
5. WHEN the user scrolls down THEN the New_Page_System SHALL compact the header to show only essential information with smooth transition
6. WHEN urgent threads exist THEN the New_Page_System SHALL display a pulsing notification dot on the header

