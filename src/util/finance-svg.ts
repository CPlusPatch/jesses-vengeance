import * as d3 from "d3";
import { JSDOM } from "jsdom";
import { type DataPoint, generateDataPoints, type Stock } from "./finance.ts";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

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
