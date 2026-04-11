export default defineAppConfig({
  ui: {
    formField: {
      slots: {
        label: 'block bold text-default',
      },
    },
    container: {
      base: "ml:px-64 px-32"
    },
    link: {
      variants: {
        active: {
          false: 'text-primary',
        },
      },
    },
  },
})
