<template>
  <div class="character" :style="{ backgroundImage: `url(${image})` }">
    <span class="character-name">{{ name }}</span>
  </div>
</template>

<script>
export default {
  name: 'Character',
  props: {
    name: String,
    image: String,
  },
};
</script>
