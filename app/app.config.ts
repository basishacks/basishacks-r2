export default defineAppConfig({
  ui: {
    container: {
      base: "w-full 2xl:max-w-[calc(100vw-48rem)] xl:max-w-[calc(100vw-40rem)] lg:max-w-[calc(100vw-28rem)] max-sm:mx-4 mx-auto px-4 sm:px-6 lg:px-8"
    },
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
