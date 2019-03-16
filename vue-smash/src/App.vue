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
        :class="{ disabled: !draftAvailable || roomState.draftStarted}"
        :disabled="!draftAvailable && roomState.draftStarted"
        @click="shufflePlayers"
        title="Randomizes the player order. This option will disappear after picking has begun."
      >
        Shuffle Players
      </button>
      <button
        class="button"
        title="Begin the drafting process."
        :class="{ disabled: !draftAvailable || roomState.draftStarted}"
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
          v-model="playerName"
          class="player-add"
          type="text"
          placeholder="Add a new player"
          :disabled="inputDisabled"
        >
        <span>Players: {{playerCount}}</span>
      </form>
    </template>

    // List of players
    <template v-slot:players-list>
      <div
        class="cell small-2 medium-3 large-auto"
        v-for="player in roomState.players"
        :key="player.name"
        @click="activePlayer = player.name"
      >
        <Player
          :is-owned="ownedPlayer === player.name"
          :is-active="roomState.activePlayer === player.name"
          :name="player.name"
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
        :class="{'character-grid--disabled': !roomState.draftStarted}"
      >

        <Character
          v-for="char in allCharacters"
          :key="`character-${char.name}`"
          :name="char.name"
          :image="char.image"
          @click.native="roomState.draftStarted && addCharToPlayer(char.name)"
        />

      </div>
    </template>

  </Page>
</template>

<script>
  import set from 'lodash/set';

  import Page from './Page';
  import Player from './components/Player';
  import Character from './components/Character';
  import allCharacters from '../../lib/chars';

  export default {
    name: 'app',
    methods: {
      addPlayer() {
        // Tell everyone
        this.emitSocket('PLAYER_ADD', this.playerName);

        // Retrieve localstorage
        const history = JSON.parse(localStorage.getItem('smashcrowd')) || {};
        // Update player name for this room
        set(history, `${this.room}.playerName`, this.playerName);
        // Set player name for this room in localstorage
        localStorage.setItem('smashcrowd', JSON.stringify(history));
      },
      shufflePlayers() {
        this.emitSocket('PLAYERS_SHUFFLE');
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
        this.emitSocket('DRAFT_START');
      },
      resetBoard() {
        this.emitSocket('ROOM_RESET');
      },
      emitSocket(event, payload) {
        this.$socket.emit(event, {
          room: this.room,
          payload,
        });
      },
    },
    mounted() {
      const history = JSON.parse(localStorage.getItem('smashcrowd'));
      // Restore player name for this room
      if (history && history[this.room]) {
        this.playerName = history[this.room].playerName;
      }
    },
    computed: {
      draftAvailable() {
        return this.roomState.players && this.roomState.players.length;
      },
      playerCount() {
        return this.roomState.players && this.roomState.players.length;
      },
      // Player has already chosen name
      inputDisabled() {
        return this.roomState.players
          && this.roomState.players.find(({ name }) => name === this.playerName);
      },
      ownedPlayer() {
        const player = this.roomState.players
          && this.roomState.players.find(({ name }) => name === this.playerName);

        return player ? player.name : '';
      }
    },
    data() {
      return {
        playerName: '',
        allCharacters: allCharacters.chars,

        room: 'awesome-superb-penguin',
        roomState: {},
      };
    },
    components: {
      Character,
      Page,
      Player,
    },
    sockets: {
      connect() {
        this.emitSocket('ROOM_JOIN', this.room);
      },
      ROOM_STATE(roomState) {
        this.roomState = roomState;
      },
    }
  }
</script>

<style lang="scss">
  @import 'assets/scss/app';
</style>
