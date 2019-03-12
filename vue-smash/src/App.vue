<template>
  <Page>

    // App buttons at the top (not bound yet)
    <template v-slot:app-buttons>
      <button
        class="button"
        :class="{disabled: !draftAvailable}"
        :disabled="!draftAvailable"
        v-on:click="resetBoard"
      >
        New Board
      </button>
      <button
        class="button"
        :class="{ disabled: !draftAvailable || draftStarted}"
        :disabled="!draftAvailable && draftStarted"
        v-on:click="shufflePlayers"
        title="Randomizes the player order. This option will disappear after picking has begun."
      >
        Shuffle Players
      </button>
      <button
        class="button"
        :class="{ disabled: !draftAvailable || draftStarted}"
        :disabled="!draftAvailable"
        v-on:click="draftStarted = true"
        title="Begin the drafting process."
      >
        Start Draft
      </button>
    </template>

    // Form list area
    <template v-slot:player-form>
      <form
        class="player-add-form"
        v-on:submit.prevent="addPlayer"
      >
        <input
          v-model="newPlayer"
          class="player-add"
          type="text"
          placeholder="Add a new player">
        <span>Players: {{playerCount}}</span>
      </form>
    </template>

    // List of players, will clean up much more soon
    <template v-slot:players-list>

      <div
        class="cell small-2 medium-3 large-auto"
        v-for="player in players"
        :key="player.name"
        v-on:click="activePlayer = player.name"
      >
        <div
          class="card player"
          :class="{
            'player--owned': ownedPlayer === player.name,
            'player--current': activePlayer === player.name
          }"
        >
          <div class="card-section">
            <h4>{{ player.name}}</h4>

            <div class="player-picker-outer">
              <button
                class="player-picker button expanded"
                :class="{'hollow': ownedPlayer === player.name}"
                v-on:click="ownedPlayer = player.name"
              >
                {{ ownedPlayer === player.name ? 'You are this player' : 'Be this player' }}
              </button>
            </div>

            <div class="player-roster-container">
              <div
                class="player-roster"
                :class="{'player-roster--empty': !player.characters.length}"
              >

                <Character
                  v-for="character in player.characters"
                  :key="`player-character-${character.name}`"
                  :name="character.name"
                  :image="character.image"
                />

              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    // Full characters roster
    <template v-slot:characters>
      <div
        class="character-grid"
        :class="{'character-grid--disabled': !draftStarted}"
      >

        <Character
          v-for="char in allCharacters"
          :key="`character-${char.name}`"
          v-on:click.native="addCharToPlayer(char.name)"
          :name="char.name"
          :image="char.image"
        />

      </div>
    </template>

  </Page>
</template>

<script>
  import shuffle from 'lodash/shuffle';

  import Page from './Page';
  import Character from './components/Character';
  import allCharacters from '../../lib/chars';

  export default {
    name: 'app',
    methods: {
      addPlayer() {
        // Add new player
        this.players.push({name: this.newPlayer, characters: [], owned: false});
        // Set each new player to active
        this.activePlayer = this.newPlayer;
        this.ownedPlayer = this.newPlayer;
        // Wipe input field
        this.newPlayer = '';
      },
      shufflePlayers() {
        this.players = shuffle(this.players);
        this.activePlayer = this.players[0].name;
      },
      addCharToPlayer(charName) {
        if (!this.draftStarted) {
          return;
        }
        // Find char object
        const char = this.allCharacters.find(({ name }) => name === charName);
        // Add it to end of active player's characters array
        this.players.find(({ name }) => name === this.activePlayer).characters.push(char);
        // Remove char from full roster
        this.allCharacters = this.allCharacters.filter(({ name }) => name !== charName);
        // Jump to next player
        this.setNextActivePlayer();
      },
      setNextActivePlayer() {
        const playerIndex = this.players.findIndex(p => p.name === this.activePlayer);
        // If last in array
        this.activePlayer = playerIndex === this.playerCount - 1
          // then jump to first player
          ? this.players[0].name
          // otherwise next index in array
          : this.players[playerIndex + 1].name;
      },
      resetBoard() {
        this.allCharacters = allCharacters.chars;
        this.players = [];
        this.draftStarted = false;
      },
    },
    computed: {
      draftAvailable() {
        return !!this.players.length;
      },
      playerCount() {
        return this.players.length;
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
      Character,
      Page,
    }
  }
</script>

<style lang="scss">
  @import 'assets/scss/app';
</style>
