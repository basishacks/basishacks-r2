<script lang="ts" setup>
const { user: userRef, clear } = useUserSession()
const userID = computed(() => userRef.value?.id ?? 0)

navigateTo("/user/" + userID.value)

</script>