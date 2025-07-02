<script setup lang="ts">
/** biome-ignore-all lint/correctness/noUnusedImports: <explanation> */
import { useUrlSearchParams } from "@vueuse/core";
import {
    BaselineSeries,
    type BaselineSeriesOptions,
    ColorType,
    CrosshairMode,
    type DeepPartial,
    LastPriceAnimationMode,
} from "lightweight-charts";
import { computed, onUnmounted, type Ref, ref } from "vue";
import { type StockParameters, stocks } from "../src/util/finance.ts";
import Chart from "./components/Chart.vue";
import StatCard from "./components/StatCard.vue";

const params = useUrlSearchParams();

const stockName = computed({
    get: () => (params.stock as string) ?? "JESS",
    set: (val) => {
        params.stock = val;
        data.value = [];
    },
});
const stockParameters = computed(
    () => stocks[stockName.value] ?? (stocks.JESS as StockParameters),
);

const data: Ref<{ date: Date; price: number }[]> = ref([]);

const formatPrice = (price: number): string =>
    Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(price);

const internal = setInterval(async () => {
    const priceJson = await fetch(`/api/v0/stocks/${stockName.value}`).then(
        (r) => r.json(),
    );

    data.value.push({
        price: priceJson.price,
        date: new Date(priceJson.time * 1000),
    });
}, 1000);

onUnmounted(() => {
    clearInterval(internal);
});
</script>

<template>
	<div class="h-dvh flex flex-col gap-4 p-4 bg-black">
        <select
            @change="(e) => (stockName = (e.target as HTMLSelectElement).value)"
            class="bg-black text-white border border-white/20 rounded-lg p-2">
            <option
                v-for="(stock, index) in Object.keys(stocks)"
                :key="index"
                :value="stock">
                {{ stock }}
            </option>
        </select>
		<div class="grid gap-4 grid-cols-4">
			<StatCard label="Stock" :value="stockName" />
			<StatCard
				label="Initial Price"
				:value="formatPrice(stockParameters.initialPrice)" />
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
						stockParameters.initialPrice) /
						stockParameters.initialPrice) *
					100
				).toFixed(2)}%`" />
		</div>
		<div
			class="flex-1 w-full rounded-lg overflow-hidden border border-white/20">
			<Chart
				:name="stockName"
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
				priceScaleId: stockName,
				baseValue: {
					price: stockParameters.initialPrice,
					type: 'price',
				},
				title: stockName,	
				lastPriceAnimation: LastPriceAnimationMode.Continuous,
			} as DeepPartial<BaselineSeriesOptions>)"
				:timeScaleOptions="{}"
				:priceScaleOptions="{}" />
		</div>
	</div>
</template>

<style scoped></style>
