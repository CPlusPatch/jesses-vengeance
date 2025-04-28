export interface Stock {
    name: string;
    parameters: StockParameters;
}

export interface StockParameters {
    initialPrice: number;
    volatility: number;
    trendStrength: number;
    jumpProbability: number;
    jumpMagnitude: number;
}

const DEFAULT_STOCK_PARAMETERS: StockParameters = {
    initialPrice: 100,
    volatility: 0.1,
    trendStrength: 0.05,
    jumpProbability: 0.001,
    jumpMagnitude: 0.1,
};

export const stocks: Record<string, StockParameters> = {
    JESS: DEFAULT_STOCK_PARAMETERS,
};

/**
 * Simulates realistic stock price evolution over time
 * @param t - Time in seconds since simulation start
 * @param initialPrice - Starting price of the stock
 * @param volatility - Base volatility factor
 * @param trendStrength - Strength of underlying trends
 * @param jumpProbability - Probability of sudden jumps
 * @param jumpMagnitude - Maximum magnitude of jumps
 * @returns The stock price at time t
 */
export function simulateStockPrice(
    t: number,
    {
        initialPrice,
        volatility,
        trendStrength,
        jumpProbability,
        jumpMagnitude,
    }: StockParameters,
): number {
    // Seed for deterministic pseudorandom behavior
    const seed = Math.sin(t * 0.234) * 10000;

    // Pseudorandom number generator based on t
    const rand = (): number => Math.abs(Math.sin(seed * (t + 1) * 0.76543)) % 1;

    // Multiple frequency components to create realistic market patterns
    const noise =
        Math.sin(t * 0.01) * 0.5 +
        Math.sin(t * 0.05) * 0.3 +
        Math.sin(t * 0.2) * 0.1 +
        Math.sin(t * 0.8) * 0.05 +
        Math.sin(t * 3) * 0.03 +
        Math.sin(t * 10) * 0.02;

    // Long-term market cycle (roughly 60-day cycle)
    const marketCycle = Math.sin(t / (60 * 60 * 6.5)) * 0.2;

    // Multi-day trends (roughly 5-day trends)
    const trend = Math.sin(t / (5 * 60 * 60 * 6.5)) * 0.1;

    // Brief stability periods
    const stabilityFactor = Math.floor(t / (60 * 30)) % 7 === 0 ? 0.5 : 1;

    // Surprise events - market crashes or spikes
    const isCrashEvent = Math.floor(t / (60 * 60 * 24 * 20)) % 30 === 0;
    const crashFactor = isCrashEvent ? 0.7 + rand() * 0.2 : 1;

    // Flash crash (very brief, severe drop)
    const isFlashCrash = Math.floor(t / 60) % 1440 === 666 && rand() < 0.3;
    const flashCrashFactor = isFlashCrash ? 0.6 + rand() * 0.3 : 1;

    // Random jumps (breaking news, earnings surprises)
    const jumpOccurs = rand() < jumpProbability;
    const jump = jumpOccurs ? (rand() * 2 - 1) * jumpMagnitude : 0;

    // Seasonal patterns (quarterly earnings cycles)
    const quarterlyEffect =
        Math.sin((t / (60 * 60 * 24 * 91)) * 2 * Math.PI) * 0.08;

    // Daily patterns (market open/close effects)
    const hourOfDay = (Math.floor(t / 60) % (60 * 24)) / 60;
    const marketOpen = hourOfDay >= 9.5 && hourOfDay <= 16;
    const dayFactor = marketOpen ? 1 : 0.3;

    // Volatility clustering (periods of high/low volatility)
    const volatilityCluster =
        0.5 + Math.abs(Math.sin(t / (60 * 60 * 48))) * 1.5;

    // Calculate the combined factors
    const randomWalk =
        (rand() * 2 - 1) *
        volatility *
        dayFactor *
        volatilityCluster *
        stabilityFactor;
    const trendComponent =
        (noise + marketCycle + trend + quarterlyEffect) * trendStrength;

    // Combine all factors
    const change =
        (randomWalk + trendComponent + jump) * crashFactor * flashCrashFactor;

    // Time-weighted price calculation
    const timeWeight = Math.min(t / (60 * 60 * 24 * 30), 10); // Cap at 10x effect after ~30 days
    const weightedChange = change * (1 + timeWeight * 0.02);

    // Result cannot go below zero
    return Math.max(initialPrice * Math.exp(weightedChange), 0.01);
}

export interface DataPoint {
    time: number;
    day: number;
    month: number;
    price: number;
    date: Date;
}

export const generateDataPoints = (
    parameters: StockParameters,
    periodSeconds: number,
    samples: number,
    start: Date,
): DataPoint[] => {
    const data: DataPoint[] = [];
    const sampleInterval = periodSeconds / samples;

    for (let i = 0; i < samples; i++) {
        const time = i * sampleInterval;
        const price = simulateStockPrice(time, parameters);
        const day = i;
        const month = Math.floor(day / 30.4); // Approximate month
        const date = new Date(start.getTime() + time * 1000);

        data.push({ time, price, day, month, date });
    }

    return data;
};
