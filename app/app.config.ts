export default defineAppConfig({
    ui: {
        container: {
            base: "w-full max-w-none px-4 sm:px-6 lg:px-8",
        },
        formField: {
            slots: {
                label: "block bold text-default",
            },
        },
        link: {
            variants: {
                active: {
                    false: "text-primary",
                },
            },
        },
    },
});
