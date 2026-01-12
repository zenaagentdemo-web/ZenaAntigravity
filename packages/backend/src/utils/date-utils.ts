/**
 * Utility for handling New Zealand Timezone (Pacific/Auckland)
 */

/**
 * Returns the current date and time in New Zealand formatted for the system prompt.
 * Handles NZST (UTC+12) and NZDT (UTC+13) automatically via Intl API.
 */
export function getNZDateTime(): { date: string; time: string; full: string; timezone: string } {
    const now = new Date();

    // Use Intl.DateTimeFormat to get parts for NZ
    const dtf = new Intl.DateTimeFormat('en-NZ', {
        timeZone: 'Pacific/Auckland',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'short'
    });

    const parts = dtf.formatToParts(now);
    const partMap = parts.reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
    }, {} as Record<string, string>);

    const dateStr = `${partMap.day} ${partMap.month} ${partMap.year}`;
    const timeStr = `${partMap.hour}:${partMap.minute}:${partMap.second}`;
    const tzStr = partMap.timeZoneName;

    return {
        date: dateStr,
        time: timeStr,
        timezone: tzStr,
        full: `${dateStr} ${timeStr} (${tzStr})`
    };
}

/**
 * Helper for relative date calculations in NZ timezone if needed
 */
export function getNZToday(): Date {
    const now = new Date();
    const nzStr = now.toLocaleString('en-US', { timeZone: 'Pacific/Auckland' });
    return new Date(nzStr);
}
