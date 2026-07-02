<template>
    <div>
        <RoleHeader />

        <UMain>
            <UContainer class="max-w-none">
                <slot />
            </UContainer>
        </UMain>

        <Footer />
    </div>
</template>
