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

const units = {
    year: 24 * 60 * 60 * 1000 * 365,
    month: (24 * 60 * 60 * 1000 * 365) / 12,
    day: 24 * 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    minute: 60 * 1000,
    second: 1000,
} as const;

const rtf = new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
});

export const formatRelativeTime = (elapsedMs: number): string => {
    // biome-ignore lint/nursery/useGuardForIn: <explanation>
    for (const unit in units) {
        const unitMs = units[unit as keyof typeof units];

        if (Math.abs(elapsedMs) > unitMs || unit === "second") {
            const delta = Math.round(elapsedMs / unitMs);
            return rtf.format(delta, unit as Intl.RelativeTimeFormatUnit);
        }
    }

    return rtf.format(elapsedMs, "second");
};
