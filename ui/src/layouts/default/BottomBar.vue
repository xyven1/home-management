<template>
  <VBottomNavigation color="primary" :rounded="30">
    <VBtn to="/lights">
      <VIcon>mdi-lightbulb</VIcon>
      <span>Lights</span>
    </VBtn>
    <VBtn to="/entertainment">
      <VIcon>mdi-speaker</VIcon>
      <span>Entertainment</span>
    </VBtn>
    <VBtn to="/irrigation">
      <VIcon>mdi-water</VIcon>
      <span>Irrigation</span>
    </VBtn>
    <VBtn to="/settings">
      <VIcon>mdi-cog</VIcon>
      <span>Settings</span>
    </VBtn>
  </VBottomNavigation>
</template>
