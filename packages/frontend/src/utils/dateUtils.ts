/**
 * Returns the date portion of a Date object in local time as YYYY-MM-DD.
 * Useful for grouping and initializing date input fields without UTC offset issues.
 */
export const getLocalISODate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
