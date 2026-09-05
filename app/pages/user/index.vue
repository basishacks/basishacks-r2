<script lang="ts" setup>
const { user: userRef } = useUserSession();
const userID = computed(() => userRef.value?.id);

if (!userID.value) {
    throw await navigateTo("/api/login");
}

throw await navigateTo("/user/" + userID.value);
</script>
