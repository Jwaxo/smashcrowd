<template>
  <div
    class="card player"
    :class="{
      'player--owned': isOwned,
      'player--current': isActive,
    }"
  >
    <div class="card-section">
      <h4>{{ name }}</h4>
      <div class="player-picker-outer">
        <button
          class="player-picker button expanded"
          :class="{ hollow: isOwned }"
          @click="$emit('own-player', name)"
        >
          {{ isOwned ? 'You are this player' : 'Be this player' }}
        </button>
      </div>

      <div class="player-roster-container">
        <div class="player-roster">
          <slot>Player characters go here</slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Player',
  props: {
    isOwned: Boolean,
    isActive: Boolean,
    name: String,
  },
};
</script>
