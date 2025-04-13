export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};

/**
 * Rounds a number to 2 decimal places, using floor
 * @param value
 * @returns
 */
export const roundCurrency = (value: number): number => {
    return Math.floor(value * 100) / 100;
};
