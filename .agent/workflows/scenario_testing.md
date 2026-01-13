---
description: Global Multi-Step Scenario Testing & AI Agent Orchestration
---

# Global Scenario Testing Workflow

This workflow represents the highest tier of verification for Zena. It mandates that every feature, button, and logic path is tested as part of a **Multi-Step Intelligence Chain**. This ensures the "AI Agent" aspect of Zena is robust across disparate application domains.

> [!CAUTION]
> **NO CHROME BROWSER**: To ensure massive scalability (100+ scenarios) and sub-second execution, all tests MUST be written as headless integration tests using `vitest` and `@testing-library`. Do not use real browser automation as it is too slow for 100 multi-step chains.

> [!IMPORTANT]
> **The 3-Step Invariant**: Every scenario MUST contain at least 3 distinct steps:
> 1.  **The Trigger**: A user action or external data event.
> 2.  **The Reasoning**: Zena's agentic response (Proactivity/Analysis).
> 3.  **The Consequence**: A state change, navigation, or cross-domain propagation.

---

## 100 Hyper-Granular Scenarios (The Master Audit)

### Domain A: Contacts & Relationship Intelligence
1.  **Search-to-Discovery**: Search name -> Zena offers profile scan -> Profile data populates.
2.  **Role Correction**: Open contact -> Zena flags role mismatch -> User accepts correction.
3.  **Engagement Nudge**: Low score contact -> AI Suggests email -> Draft generated with correct context.
4.  **Link-to-Property**: Create contact -> Zena links to existing property 123 Main -> Property detail shows new owner.
5.  **Batch Intelligence**: Select 10 contacts -> click "Batch Intel" -> AI categorizes all 10.
6.  **Discovery Socket**: Trigger slow profile scan -> Zena shows "Brain thinking" -> Result pops in via Socket.
7.  **Duplicate Block**: Type existing email -> Zena blocks & links to old record -> Auto-navigation.
8.  **Oracle Hover**: Hover Oracle badge -> Personality prediction fires -> Displayed in tooltip.
9.  **Score Breakdown**: Click Intel Score -> Detail modal opens -> Reasoning steps displayed.
10. **Note-to-Task**: Add contact note -> Zena extracts "Call back" -> Task created.
11. **Social Scrape**: Add LinkedIn URL -> Zena pulls (mock) -> Title/Company populates.
12. **Decay Alert**: Contact > 30 days stagnant -> Orb turns stale -> Dashboard card appears.
13. **CSV Mapping**: Bulk upload -> Zena auto-maps columns -> Confirm 5 records created.
14. **Semantic Filtering**: Query "Active buyers" -> Zena applies filters + specific AI insight.
15. **Contextual Add**: Search "Bob Realtor" -> Zena: "Create Bob?" -> Pre-fills "Agent" role.

### Domain B: Properties & Market Analysis
16. **Address Extraction**: Type address in Search -> Zena pulls market data -> Map widget updates.
17. **Listing Copy**: Open property -> "Generate Copy" -> AI drafts "Premium Executive Home".
18. **Distance Risk**: Upload CMA -> Zena flags comps too far away -> Risk warning.
19. **Owner Linkage**: Link contact as Vendor -> Contact page updates -> Dashboard shows "Listing in progress".
20. **URL Scrape**: New URL -> Scraper fires -> Modal shows extracted price/rooms.
21. **Batch Position**: Select 5 homes -> "Batch Tag" -> AI analyzes market position for all.
22. **Stage Progression**: Appraisal to Listed -> Requirement check (Agreement) -> Success banner.
23. **Map Popup**: Click map pin -> Intelligence popup -> Scan Profile button visibility.
24. **Vision Analysis**: Upload photo -> Zena labels "Kitchen, Modern" -> Auto-category.
25. **Task Propagation**: Add note "Roof fix" -> Property task created -> Task board updates.
26. **Yield Assessment**: Enter Price/Rent -> Zena calculates Yield -> Risk assessment popup.
27. **Lookalike Search**: "Homes like 123 Main" -> Zena filters by bedroom/range -> List updates.
28. **Timeline Summary**: View timeline -> Zena summarizes: "Listed for 45 days, 2 price drops".
29. **Persistence**: Edit property offline -> Toast: "Queued" -> Syncs on reconnect.
30. **Valuation Alert**: Hover shield icon -> Zena: "This property is undervalued by 5%".

### Domain C: Deal Flow & Transactional Logic
31. **End-to-End Deal**: Contact -> Deal -> Property link -> All 3 entities synced.
32. **MIL-Blocker**: Move to Unconditional -> LIM missing -> Zena blocks & offers fix.
33. **Auto-Commission**: Select deal stage -> Check Settings -> Commission field auto-fills.
34. **Thread Sentiment**: Receive email thread -> Zena marks Deal sentiment "Cold".
35. **Strategy Hub**: Click Zap -> Strategic Actions Modal -> 3 AI paths offered.
36. **Discovery Jumper**: Click Deal "Last Comms" -> Jumps to Thread view -> Correct filters.
37. **Rescue Action**: Old deal -> AI creates notification -> "Resuscitate" action button.
38. **Offer Analytics**: Input 2 offers -> Zena compares Conditions/Price -> Recommendation.
39. **Signed Guardrail**: Upload contract -> Zena verifies "Signed" -> Next stage unlocks.
40. **Timeline Estimates**: Enter stage -> Zena estimates "Settle in 45 days" -> Calendar update.
41. **Joint Purchase**: Add 2nd buyer -> Zena: "Draft Joint Invite?" -> Inbox draft.
42. **Pipeline Forecaster**: View Deal Flow -> Zena insight: "Q1 looks low, focus on leads".
43. **Archive Logic**: Low sentiment + 60 days -> Zena suggests archive -> Task removed.
44. **Condition Watch**: Condition date tomorrow -> Alert: "LIM due!" -> Push notification.
45. **Finance Link**: Buyer: "Bank approved" in email -> Zena updates "Finance" condition status.
46. **PDF Generation**: Click "Report" -> Zena compiles stats -> Draft PDF queued.
47. **Settlement Prep**: Settlement -7 days -> "Key Handover Task" created -> Calendar event.
48. **Anniversary SMS**: 1 year post-settle -> Zena: "Anniversary?" -> Draft nurture SMS.
49. **Listing Collision**: Property linked to 2 active appraisal deals -> Zena warns "Conflict".
50. **Priority Orb**: Mark deal "Gold" -> Dash colors shift -> Godmode prioritizes replies.

### Domain D: Inbox, Comms & Event Loop
51. **Smart Reply**: Email arrives -> AI suggests 3 replies -> Click 1 -> Modal pre-filled.
52. **Thread Mapping**: Unknown email -> Search suggested contacts -> User links -> Thread color update.
53. **Note-to-Action**: "Please follow up" -> Zena: "Create Task?" -> Acceptance creates Task.
54. **Date Extraction**: "Meeting tomorrow 3pm" -> Zena suggests event -> Calendar adds it.
55. **Multi-Draft**: Select 50 leads -> Click "Zena Compose" -> 50 personalized drafts.
56. **Importance Filter**: Query "Urgent" -> Zena filters by AI "Importance" score.
57. **Voice-to-Email**: "Record voice: Yes, good" -> Transcription -> Reply drafted.
58. **Recap Badge**: Long thread -> Zena "Recap" badge -> Click to see 3 bullets.
59. **Forwarding Loop**: Forward email to Zena -> AI: "Adding John" -> Contact created.
60. **Focus-Snooze**: Snooze for "When free" -> Zena checks focus status -> Wakes up correctly.
61. **Invoice Scan**: Attachment "Invoice" -> Zena: "Add to Expenses?" -> Linked to deal.
62. **VIP Glow**: High value sender -> Inbox orb glows purple -> Top of list position.
63. **Multi-Entity Link**: Email mentions 2 homes -> Zena labels both -> Split view.
64. **Style Learning**: AI drafts email -> User edits -> Zena: "Learn this style?".
65. **Spam-to-Archive**: Junk detection -> Zena: "Auto-archive spam?" -> Preference saved.

### Domain E: Calendar, Open Homes & Scheduling
66. **OH Feedback**: Finish OH -> Feedback prompt opens -> Update attendees in 1 click.
67. **Drag Conflict**: Drag event to busy slot -> Zena: "Clash! Move?" -> Auto-adjust.
68. **Collateral Gen**: OH tomorrow -> Zena: "Print CMA?" -> PDF generated.
69. **Weather Advisory**: Hover event -> Zena: "Raining, move indoors" -> Draft update sent.
70. **Logistics Buffer**: 2 meetings apart -> Zena adds "Travel" buffer -> Warning shown.
71. **Delegate Triage**: Assistant free? -> Zena: "Delegate viewings" -> Invitation sent.
72. **Waitlist Promo**: Canceled slot -> Zena finds 2nd lead -> Drafts: "Slot open!".
73. **History Jump**: View event -> Click attendee -> Jumps to full history.
74. **Missed Recurrence**: Weekly call -> Zena detects missed -> Suggests rescheduled.
75. **Agenda Briefing**: Morning -> Zena: "Here's your day, 3 focus blocks" -> Focus Mode.

### Domain F: Tasks, Godmode & Autonomous Logic
76. **Bulk Approval**: Inbox -> Godmode drafts actions -> user clicks "Approve all 5".
77. **Unlock Chain**: Mark "Photos done" -> Zena unlocks "Create Listing" task -> Alert.
78. **Visual Priority**: 5 overdue -> Orbital view shows largest bubble as most urgent.
79. **Load Balance**: Select 20 -> "Defer to Monday" -> Zena balances workload across days.
80. **Godmode Shift**: Switch to "Aggresssive" -> Tasks move to "Urgent" status.
81. **Voice Checklist**: "Remind me buy milk" -> Task with created checklist.
82. **Efficiency Audit**: "How am I doing?" -> Zena: "Completing 80%, suggest delegating".
83. **Cross-Nav Task**: Click Property on Task -> Property opens -> Task sidebar visible.
84. **Tenacity Check**: Red font -> Zena: "This has been pending for 10 days, escalate?".
85. **Auto-Pilot**: Trusted sender -> Godmode "Fast-Track" -> Reply sends (mock).
86. **Distraction Block**: "Focus on deals" -> Hidden emails -> Countdown timer active.
87. **Sub-Task AI**: Create "Marketing" -> Zena: "Include Social, Print?" -> Checkboxes.
88. **Calendar Blocking**: Important task -> Zena: "Block 2 hours on calendar?".
89. **Streak Awards**: Complete 5 -> Pulse animation -> Intelligence reward badge.
90. **External Pipeline**: Complete task -> CRM Activity Log updated via external SDK.

### Domain G: Settings, Onboarding & Infrastructure
91. **Connector Loop**: Click connect -> Auth loop -> Successful record sync.
92. **Briefing Config**: Disable "Market News" -> Refresh -> Component hidden.
93. **Mentor Persona**: Change to "Mentor" -> Advice tone shifts from "Execution" to "Strategy".
94. **Onboarding Persistence**: Skip setup -> Zena reminder in 24h -> "Resume" button.
95. **Token Refresh**: Expired token -> Zena: "Auth expired" -> Redirect to LoginPage.
96. **Offline Cache**: Search offline -> Zena uses local cache -> "Cached Result" label.
97. **Data Invariant**: Delete contact -> Audit entry -> all threads unlinked.
98. **Telemetry Heartbeat**: API down -> dashboard shows "System Heartbeat Low".
99. **Reward Loop**: User rates 5/5 -> Zena: "Thank you, prioritizing similar chains".
100. **Omni-Search**: Query "John" -> Zena links Map, Email, and Phone records.

---

## Reporting & Visibility

All scenario results MUST be summarized in `scenarios_dashboard.md` using the following status indicators:

| Category | Identifier | Result | Chain Summary |
| :--- | :--- | :---: | :--- |
| **Contacts** | S01 | ✅ | Input -> Reasoning -> State Change |
| **Inbox** | S52 | ❌ | Trigger -> [FAILED: Reasoning] -> No Action |
| **Deals** | S31 | ⚪ | Implementation Pending |

- ✅ **Pass**: All 3+ steps of the chain executed and verified.
- ❌ **Fail**: The chain broke at a specific reasoning or execution step.
- ⚪ **Pending**: Scenario mapped but not yet implemented.

## Implementation Process ivory

## Verification Checklist
- [ ] Does the scenario involve at least 2 disparate pages/services?
- [ ] Is Zena's proactivity explicitly tested?
- [ ] Does the chain complete without user intervention after Phase 1 (if Godmode)?
- [ ] successfully avoids real browser usage?
