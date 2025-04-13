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

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * @param min
 * @param max
 * @returns
 */
export const randint = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
