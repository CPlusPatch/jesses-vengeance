<script setup lang="ts">
/** biome-ignore-all lint/correctness/noUnusedImports: <explanation> */
import {
    BaselineSeries,
    type BaselineSeriesOptions,
    ColorType,
    CrosshairMode,
    type DeepPartial,
    LastPriceAnimationMode,
} from "lightweight-charts";
import {
    generateDataPoints,
    type Stock,
    type StockParameters,
    stocks,
} from "../src/util/finance.ts";
import Chart from "./components/Chart.vue";
import StatCard from "./components/StatCard.vue";

const stock: Stock = {
    name: "JESS",
    parameters: stocks.JESS as StockParameters,
};

const periodSeconds = 60 * 60 * 24 * 365;
const samples = 500;
const start = new Date(2025, 0, 0);
const data = generateDataPoints(
    stock.parameters,
    periodSeconds,
    samples,
    start,
);

const formatPrice = (price: number): string =>
    Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(price);
</script>

<template>
	<div class="h-dvh flex flex-col gap-4 p-4 bg-black">
		<div class="grid gap-4 grid-cols-6">
			<StatCard label="Stock" :value="stock.name" />
			<StatCard
				label="Initial Price"
				:value="formatPrice(stock.parameters.initialPrice)" />
			<StatCard label="Period" value="One year" />
			<StatCard
				label="Average"
				:value="
					formatPrice(
						data.reduce((acc, d) => acc + d.price, 0) / data.length
					)
				" />
			<StatCard
				label="Change"
				:value="`${(
					(((data.at(-1)?.price ?? 0) -
						stock.parameters.initialPrice) /
						stock.parameters.initialPrice) *
					100
				).toFixed(2)}%`" />
			<StatCard label="Samples" :value="samples.toString()" />
		</div>
		<div
			class="flex-1 w-full rounded-lg overflow-hidden border border-white/20">
			<Chart
				name="JESS"
				:type="BaselineSeries"
				:data="
					data.map((d) => ({
						time: d.date.getTime() / 1000,
						value: d.price,
					}))
				"
				:autosize="true"
				:chartOptions="{
					grid: {
						horzLines: {
							color: '#444',
						},
						vertLines: {
							color: '#444',
						},
					},
					crosshair: {
						mode: CrosshairMode.Magnet,
					},
					layout: {
						background: {
							type: ColorType.VerticalGradient,
							bottomColor: '#000',
							topColor: '#222',
						},
						textColor: '#eee',
						fontFamily: 'monospace',
					},
				}"
				:seriesOptions="({
				priceScaleId: 'JESS',
				baseValue: {
					price: stock.parameters.initialPrice,
					type: 'price',
				},
				title: 'JESS',	
				lastPriceAnimation: LastPriceAnimationMode.Continuous,
			} as DeepPartial<BaselineSeriesOptions>)"
				:timeScaleOptions="{}"
				:priceScaleOptions="{}" />
		</div>
	</div>
</template>

<style scoped></style>
