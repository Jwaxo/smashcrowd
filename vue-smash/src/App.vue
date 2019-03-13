<template>
  <Page>

    // App buttons at the top (not bound yet)
    <template v-slot:app-buttons>
      <button
        class="button"
        :class="{disabled: !draftAvailable}"
        :disabled="!draftAvailable"
        @click="resetBoard"
      >
        New Board
      </button>
      <button
        class="button"
        :class="{ disabled: !draftAvailable || draftStarted}"
        :disabled="!draftAvailable && draftStarted"
        @click="shufflePlayers"
        title="Randomizes the player order. This option will disappear after picking has begun."
      >
        Shuffle Players
      </button>
      <button
        class="button"
        title="Begin the drafting process."
        :class="{ disabled: !draftAvailable || draftStarted}"
        :disabled="!draftAvailable"
        @click="startDraft"
      >
        Start Draft
      </button>
    </template>

    // Form list area
    <template v-slot:player-form>
      <form
        class="player-add-form"
        @submit.prevent="addPlayer"
      >
        <input
          v-model="newPlayer"
          class="player-add"
          type="text"
          placeholder="Add a new player">
        <span>Players: {{playerCount}}</span>
      </form>
    </template>

    // List of players
    <template v-slot:players-list>
      <div
        class="cell small-2 medium-3 large-auto"
        v-for="player in players"
        :key="player.name"
        @click="activePlayer = player.name"
      >
        <Player
          :is-owned="ownedPlayer === player.name"
          :is-active="activePlayer === player.name"
          :name="player.name"
          @own-player="setOwnedPlayer"
        >
          <div v-if="!player.characters.length" class="add-character"></div>

          <Character
            v-for="character in player.characters"
            :key="`player-character-${character.name}`"
            :name="character.name"
            :image="character.image"
          />

        </Player>

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
          :name="char.name"
          :image="char.image"
          @click.native="draftStarted && addCharToPlayer(char.name)"
        />

      </div>
    </template>

  </Page>
</template>

<script>
  import shuffle from 'lodash/shuffle';

  import Page from './Page';
  import Player from './components/Player';
  import Character from './components/Character';
  import allCharacters from '../../lib/chars';

  export default {
    name: 'app',
    methods: {
      addPlayer() {
        // Add new player
        this.players.push({
          name: this.newPlayer,
          characters: [],
          owned: false,
        });
        // Set each new player to active
        this.activePlayer = this.newPlayer;
        this.ownedPlayer = this.newPlayer;
        // Wipe input field
        this.newPlayer = '';
      },
      setOwnedPlayer(name) {
        this.ownedPlayer = name;
      },
      shufflePlayers() {
        this.players = shuffle(this.players);
      },
      addCharToPlayer(charName) {
        // Find char object
        const char = this.allCharacters.find(({name}) => name === charName);
        // Add it to end of active player's characters array
        this.players.find(({name}) => name === this.activePlayer).characters.push(char);
        // Remove char from full roster
        this.allCharacters = this.allCharacters.filter(({name}) => name !== charName);
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
      startDraft() {
        this.draftStarted = true;
        this.activePlayer = this.players[0].name;
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
      Player,
    }
  }
</script>

<style lang="scss">
  @import 'assets/scss/app';
</style>
