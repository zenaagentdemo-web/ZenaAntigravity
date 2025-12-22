import { Conversation } from '../components/AskZena';

export interface GroupingResult {
    label: string;
    conversations: Conversation[];
}

/**
 * Groups conversations into granular timeframes like Today (Day), Yesterday (Day), 
 * Day Names, Last Week, and Older.
 */
export const groupConversationsByDate = (
    conversations: Conversation[],
    now: Date = new Date()
): GroupingResult[] => {
    const groups: {
        today: Conversation[];
        yesterday: Conversation[];
        lastSevenDays: Record<string, Conversation[]>;
        lastWeek: Conversation[];
        older: Conversation[];
    } = {
        today: [],
        yesterday: [],
        lastSevenDays: {},
        lastWeek: [],
        older: []
    };

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Normalize "now" to midnight for consistent comparisons
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfToday.getDate() - 1);

    const startOfSevenDaysAgo = new Date(startOfToday);
    startOfSevenDaysAgo.setDate(startOfToday.getDate() - 7);

    const startOfFourteenDaysAgo = new Date(startOfToday);
    startOfFourteenDaysAgo.setDate(startOfToday.getDate() - 14);

    conversations.forEach((conv) => {
        const date = new Date(conv.updatedAt);
        const timestamp = date.getTime();

        if (timestamp >= startOfToday.getTime()) {
            groups.today.push(conv);
        } else if (timestamp >= startOfYesterday.getTime()) {
            groups.yesterday.push(conv);
        } else if (timestamp >= startOfSevenDaysAgo.getTime()) {
            const dayName = days[date.getDay()];
            if (!(groups.lastSevenDays as any)[dayName]) {
                (groups.lastSevenDays as any)[dayName] = [];
            }
            (groups.lastSevenDays as any)[dayName].push(conv);
        } else if (timestamp >= startOfFourteenDaysAgo.getTime()) {
            groups.lastWeek.push(conv);
        } else {
            groups.older.push(conv);
        }
    });

    const result: GroupingResult[] = [];

    // 1. Today
    if (groups.today.length > 0) {
        result.push({
            label: `Today (${days[now.getDay()]})`,
            conversations: groups.today
        });
    }

    // 2. Yesterday
    if (groups.yesterday.length > 0) {
        const yesterdayDate = new Date(startOfYesterday);
        result.push({
            label: `Yesterday (${days[yesterdayDate.getDay()]})`,
            conversations: groups.yesterday
        });
    }

    // 3. Past 7 Days (Ordered descending)
    const dayIndices = [];
    for (let i = 2; i < 7; i++) {
        const d = new Date(startOfToday);
        d.setDate(startOfToday.getDate() - i);
        dayIndices.push(d.getDay());
    }

    dayIndices.forEach(idx => {
        const dayName = days[idx];
        const convs = (groups.lastSevenDays as any)[dayName];
        if (convs && convs.length > 0) {
            result.push({ label: dayName, conversations: convs });
        }
    });

    // 4. Last Week
    if (groups.lastWeek.length > 0) {
        result.push({ label: 'Last Week', conversations: groups.lastWeek });
    }

    // 5. Older
    if (groups.older.length > 0) {
        result.push({ label: 'Older', conversations: groups.older });
    }

    return result;
};
