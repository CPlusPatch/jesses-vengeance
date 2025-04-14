<script setup lang="ts">
defineProps<{
    label: string;
    value: string;
}>();
</script>

<template>
	<div
		class="flex flex-col bg-zinc-900 rounded p-2 gap-1 border-white/10 border shadow">
		<div class="text-xs text-gray-300">{{ label }}</div>
		<div class="text-xl text-gray-100 font-bold">{{ value }}</div>
	</div>
</template>
