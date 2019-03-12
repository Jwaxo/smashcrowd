<template>
  <Page>

    // App buttons at the top (not bound yet)
    <template v-slot:app-buttons>
      <button id="reset" data-open="modal_new_board" class="reset button" v-on:click="resetBoard">
        New Board
      </button>
      <button id="randomize" class="randomize button" title="Randomizes the player order. This option will disappear after picking has begun."
      >
        Shuffle Players
      </button>
      <button
        id="start_picking"
        class="start-draft button"
        title="Begin the drafting process."
        :class="{ disabled: !draftAvailable}"
      >
        Start Draft
      </button>
    </template>

    // Form list area
    <template v-slot:player-form>
      <form v-on:submit.prevent="addPlayer" class="player-add-form">
        <input v-model="newPlayer" class="player-add" tabindex="1" type="text" placeholder="Add a new player">
      </form>
    </template>

    // List of players, will clean up much more soon
    <template v-slot:players-list>
      <!-- Temp -->
      <div
        v-for="player in players"
        :key="player.name"
        v-on:click="activePlayer=player.name"
        class="cell small-2 medium-3 large-auto"
      >
        <div class="card player" :class="{'player--owned': ownedPlayer === player.name, 'player--current': activePlayer === player.name}">
          <div class="card-section">
            <h4>{{ player.name}}</h4>

            <div class="player-picker-outer">
              <button
                class="player-picker button expanded"
                :class="{'hollow': ownedPlayer === player.name && activePlayer === player.name}"
                v-on:click="ownedPlayer = player.name"
              >
                Be This Player
              </button>
            </div>

            <div class="player-roster-container">
              <div class="player-roster" :class="{'player-roster--empty': !player.characters.length}">
                <div
                  class="character"
                  v-for="character in player.characters"
                  :key="`player-character-${character.name}`"
                  :style="{backgroundImage: `url(${character.image})`}"
                >
                  <span class="character-name">{{character.name}}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </template>

    // Full characters roster
    <template v-slot:characters>
      <div class="character-grid" :class="{'character-grid--disabled': !draftAvailable}">
        <div
          class="character"
          v-for="char in allCharacters"
          :key="`character-${char.name}`"
          v-on:click="addCharToPlayer(char.name)"
          :style="{backgroundImage: `url(${char.image})`}"
        >
          <span class="character-name">{{char.name}}</span>
        </div>
      </div>
    </template>

  </Page>
</template>

<script>
import Page from './Page';
import allCharacters from '../../lib/chars';

export default {
  name: 'app',
  methods: {
    addPlayer() {
      // Add new player
      this.players.push({ name: this.newPlayer, characters: [], owned: false });
      // Set each new player to active
      this.activePlayer = this.newPlayer;
      this.ownedPlayer = this.newPlayer;
      // Wipe input field
      this.newPlayer = '';
    },
    addCharToPlayer(charName) {
      if (!this.draftAvailable) {
        return;
      }
      // Find char object
      const char = this.allCharacters.find(char => char.name === charName);
      // Add it to end of active player's characters array
      this.players.find(player => player.name === this.activePlayer).characters.push(char);
      // Remove char from full roster
      this.allCharacters = this.allCharacters.filter(char => char.name !== charName);
    },
    resetBoard() {
      this.allCharacters = allCharacters.chars;
      this.players = [];
    },
  },
  computed: {
    draftAvailable() {
      return !!this.players.length;
    },
  },
  data() {
    return {
      newPlayer: '',
      activePlayer: '',
      ownedPlayer: '',
      draftStarted: false,
      allCharacters: allCharacters.chars,
      players: [],
    };
  },
  components: {
    Page
  }
}
</script>

<style lang="scss">
  @import 'assets/scss/settings';
  @import 'assets/scss/system';
  @import 'assets/scss/board';
  @import 'assets/scss/characters';
  @import 'assets/scss/players';
  @import '~foundation-sites/scss/foundation';
</style>
