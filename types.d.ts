declare module "*.vue" {
    import type { DefineComponent } from "vue";
    // biome-ignore lint/complexity/noBannedTypes: Vue uses themidk
    const component: DefineComponent<{}, {}, any>;
    export default component;
}
