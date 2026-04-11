export default defineAppConfig({
  ui: {
    formField: {
      slots: {
        label: 'block bold text-default',
      },
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
