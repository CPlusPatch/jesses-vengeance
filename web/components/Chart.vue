<script setup lang="ts">
import {
    type ChartOptions,
    createChart,
    type DeepPartial,
    type IChartApi,
    type ISeriesApi,
    LineSeries,
    type PriceScaleOptions,
    type SeriesDefinition,
    type SeriesOptions,
    type SeriesType,
    type TimeScaleOptions,
} from "lightweight-charts";
import { onMounted, onUnmounted, ref, watch } from "vue";

const {
    name,
    type = LineSeries,
    autosize = true,
    data,
    chartOptions,
    seriesOptions,
    timeScaleOptions,
    priceScaleOptions,
} = defineProps<{
    name: string;
    type: SeriesDefinition<SeriesType>;
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    data: any[];
    autosize: boolean;
    chartOptions: DeepPartial<ChartOptions>;
    seriesOptions: DeepPartial<SeriesOptions<SeriesType>>;
    timeScaleOptions: DeepPartial<TimeScaleOptions>;
    priceScaleOptions: DeepPartial<PriceScaleOptions>;
}>();

let series: ISeriesApi<SeriesType> | null = null;
let chart: IChartApi | null = null;

const chartContainer = ref();

const fitContent = (): void => {
    if (!chart) {
        return;
    }
    chart.timeScale().fitContent();
};

const getChart = (): IChartApi | null => {
    return chart;
};

defineExpose({ fitContent, getChart });

// Auto resizes the chart when the browser window is resized.
const resizeHandler = (): void => {
    if (!(chart && chartContainer.value)) {
        return;
    }
    const dimensions = chartContainer.value.getBoundingClientRect();
    chart.resize(dimensions.width, dimensions.height);
};

// Creates the chart series and sets the data.
const addSeriesAndData = (): void => {
    if (!chart) {
        return;
    }

    series = chart.addSeries(type, seriesOptions);
    series.setData(data);
};

onMounted(() => {
    // Create the Lightweight Charts Instance using the container ref.
    chart = createChart(chartContainer.value, chartOptions);
    addSeriesAndData();

    if (priceScaleOptions) {
        chart.priceScale(name).applyOptions(priceScaleOptions);
    }

    if (timeScaleOptions) {
        chart.timeScale().applyOptions(timeScaleOptions);
    }

    chart.timeScale().fitContent();

    if (autosize) {
        window.addEventListener("resize", resizeHandler);
    }
});

onUnmounted(() => {
    if (chart) {
        chart.remove();
        chart = null;
    }
    if (series) {
        series = null;
    }
    window.removeEventListener("resize", resizeHandler);
});

/*
 * Watch for changes to any of the component properties.

 * If an options property is changed then we will apply those options
 * on top of any existing options previously set (since we are using the
 * `applyOptions` method).
 *
 * If there is a change to the chart type, then the existing series is removed
 * and the new series is created, and assigned the data.
 *
 */
watch(
    () => autosize,
    (enabled) => {
        if (!enabled) {
            window.removeEventListener("resize", resizeHandler);
            return;
        }
        window.addEventListener("resize", resizeHandler);
    },
);

watch(
    () => type,
    () => {
        if (series && chart) {
            chart.removeSeries(series);
        }
        addSeriesAndData();
    },
);

watch(
    () => data,
    (newData) => {
        if (!series) {
            return;
        }
        series.setData(newData);
    },
);

watch(
    () => chartOptions,
    (newOptions) => {
        if (!chart) {
            return;
        }
        chart.applyOptions(newOptions);
    },
);

watch(
    () => seriesOptions,
    (newOptions) => {
        if (!series) {
            return;
        }
        series.applyOptions(newOptions);
    },
);

watch(
    () => priceScaleOptions,
    (newOptions) => {
        if (!chart) {
            return;
        }
        chart.priceScale(name).applyOptions(newOptions);
    },
);

watch(
    () => timeScaleOptions,
    (newOptions) => {
        if (!chart) {
            return;
        }
        chart.timeScale().applyOptions(newOptions);
    },
);
</script>

<template>
	<div class="lw-chart" ref="chartContainer"></div>
</template>

<style scoped>
.lw-chart {
	height: 100%;
}
</style>
