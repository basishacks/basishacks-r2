<template>
    <div>
        <RoleHeader />

        <UMain class="bg-red-100">
            <UContainer>
                <slot />
            </UContainer>
        </UMain>

        <Footer />
    </div>
</template>
