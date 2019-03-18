<template>
  <div class="grid-container">
    <div class="grid-x grid-margin-x">
      <div class="cell medium-6 large-4">
        <h1>SmashCrowd</h1>
        <p>Draft your next online Smashdown!</p>
        <router-view></router-view>
      </div>

      <div class="cell medium-6 large-8 text-right">
        <div id="board_info_container" class="board-info">
          <h4>Draft Type: snake</h4>
          <h4>Round: 0</h4>
          <div class="board-options grid-x grid-margin-x">
            <div class="cell auto">
              <slot name="app-buttons"></slot>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="players_container">
      <div class="grid-x grid-margin-x">
        <div class="medium-6 cell">
          <slot name="player-form"></slot>
        </div>
      </div>

      <div class="grid-x grid-margin-x">
        <slot name="players-list"></slot>
      </div>
    </div>

    <div id="characters-container" class="grid-x grid-margin-x">
      <div class="cell">
        <slot name="characters"></slot>
      </div>
    </div>
  </div>
</template>
