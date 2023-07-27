<template>
  <VMain :class="$router.currentRoute.value.meta.fixedHeight ? 'fill-height': ''">
    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </VMain>
</template>