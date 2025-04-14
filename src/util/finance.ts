import * as d3 from "d3";
/* import { JSDOM } from "jsdom"; */

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

const DAY_IN_MS = 24 * 60 * 60 * 1000;

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
function simulateStockPrice(
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

interface DataPoint {
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

export const stockToSVG = (
    stock: Stock,
    periodSeconds = 60 * 60 * 24 * 365,
    start = new Date(2025, 0, 0),
): string => {
    // Generate the data
    const data = generateDataPoints(
        stock.parameters,
        periodSeconds,
        365,
        start,
    );

    // Calculate statistics
    const prices = data.map((point) => point.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const startPrice = data[0]?.price ?? 0;
    const endPrice = data.at(-1)?.price ?? 0;
    const percentChange = ((endPrice - startPrice) / startPrice) * 100;

    // Set up dimensions and margins
    const width = 900;
    const height = 500;
    const margin = { top: 50, right: 80, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create scales
    const xScale = d3
        .scaleTime()
        .domain(d3.extent(data, (d) => d.date) as [Date, Date])
        .range([0, innerWidth]);

    const yScale = d3
        .scaleLinear()
        .domain([Math.max(0, minPrice * 0.9), maxPrice * 1.1]) // Give some padding
        .range([innerHeight, 0]);

    // Create line generator
    const line = d3
        .line<DataPoint>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.price))
        .curve(d3.curveMonotoneX); // Use monotone curve for smoother appearance

    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    const document = dom.window.document;

    // Create SVG element
    const svg = d3
        .select(document.body)
        .append("svg")
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("style", "max-width: 100%; height: auto;");

    // Add background
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#f8f9fa");

    // Create the plot area
    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add grid lines
    g.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call((g) => g.select(".domain").remove())
        .call((g) =>
            g
                .selectAll(".tick line")
                .attr("stroke", "#e0e0e0")
                .attr("stroke-dasharray", "2,2"),
        );

    g.append("g")
        .attr("class", "grid")
        .call((g) => g.select(".domain").remove())
        .call((g) =>
            g
                .selectAll(".tick line")
                .attr("stroke", "#e0e0e0")
                .attr("stroke-dasharray", "2,2"),
        );

    // Draw the price line
    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#2563eb")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Add quarterly reference lines
    const quarters = [90, 180, 270].map((day) => {
        return {
            day,
            date: new Date(start.getTime() + day * DAY_IN_MS),
            label: `Q${Math.floor(day / 90) + 1}`,
        };
    });

    for (const quarter of quarters) {
        g.append("line")
            .attr("x1", xScale(quarter.date))
            .attr("y1", 0)
            .attr("x2", xScale(quarter.date))
            .attr("y2", innerHeight)
            .attr("stroke", "#888")
            .attr("stroke-dasharray", "5,5");

        g.append("text")
            .attr("x", xScale(quarter.date) + 5)
            .attr("y", 15)
            .attr("fill", "#666")
            .text(quarter.label);
    }

    // Add initial price reference line
    g.append("line")
        .attr("x1", 0)
        .attr("y1", yScale(stock.parameters.initialPrice))
        .attr("x2", innerWidth)
        .attr("y2", yScale(stock.parameters.initialPrice))
        .attr("stroke", "#888")
        .attr("stroke-dasharray", "5,5");

    g.append("text")
        .attr("x", innerWidth + 5)
        .attr("y", yScale(stock.parameters.initialPrice) + 4)
        .attr("fill", "#666")
        .text(`Initial ($${stock.parameters.initialPrice.toFixed(2)})`);

    // Add X axis
    g.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(null).ticks(12))
        .call((g) => g.selectAll("text").attr("font-size", "12px"));

    // Add Y axis
    g.append("g")
        .call(
            d3.axisLeft(yScale).tickFormat((d) => `$${d.valueOf().toFixed(0)}`),
        )
        .call((g) => g.selectAll("text").attr("font-size", "12px"));

    // Add Y axis label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .text("Price ($)");

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .text(`Evolution of $${stock.name}`);

    // Add statistics
    const statsFontSize = "12px";
    const statsY = height - 15;

    svg.append("text")
        .attr("x", margin.left)
        .attr("y", statsY)
        .attr("font-size", statsFontSize)
        .text(`Start: $${startPrice.toFixed(2)}`);

    svg.append("text")
        .attr("x", margin.left + 150)
        .attr("y", statsY)
        .attr("font-size", statsFontSize)
        .text(`End: $${endPrice.toFixed(2)}`);

    svg.append("text")
        .attr("x", margin.left + 300)
        .attr("y", statsY)
        .attr("font-size", statsFontSize)
        .attr("fill", percentChange >= 0 ? "green" : "red")
        .text(`Change: ${percentChange.toFixed(2)}%`);

    svg.append("text")
        .attr("x", margin.left + 450)
        .attr("y", statsY)
        .attr("font-size", statsFontSize)
        .text(`Min: $${minPrice.toFixed(2)} | Max: $${maxPrice.toFixed(2)}`);

    return svg.node()?.outerHTML ?? "";
};
