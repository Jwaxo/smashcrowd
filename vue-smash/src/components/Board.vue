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
      Room: {{ $route.params.room }}
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
      </form>
      <div v-if="isActivePlayer && roomState.draftStarted" class="callout success">
        <h5>It is your turn!</h5>
      </div>
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
          @own-player="ownPlayer"
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
        :class="{'character-grid--disabled': !roomState.draftStarted || !isActivePlayer}"
      >

        <Character
          v-for="char in roomState.characters"
          :key="`character-${char.name}`"
          :name="char.name"
          :image="char.image"
          @click.native="isActivePlayer && roomState.draftStarted && addCharToPlayer(char.name)"
        />

      </div>
    </template>

  </Page>
</template>

<script>
  import set from 'lodash/set';
  import { uniqueNamesGenerator } from 'unique-names-generator/dist/index';

  import Page from './Page';
  import Player from './Player';
  import Character from './Character';

  export default {
    name: 'Board',
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
        this.emitSocket('PLAYER_ADD_CHARACTER', {
          charName,
          playerName: this.playerName,
        });
      },
      startDraft() {
        this.emitSocket('DRAFT_START');
      },
      ownPlayer(name) {
        this.playerName = name;
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
      // Forward to named room
      if (!this.$route.params.room) {
        this.$router.push(uniqueNamesGenerator('-'));
      }

      // Pull player name for this room from localstorage
      const history = JSON.parse(localStorage.getItem('smashcrowd'));
      // Restore player name for this room
      if (history && history[this.room]) {
        this.playerName = history[this.room].playerName;
      }
    },
    computed: {
      room() {
        return this.$route.params.room;
      },
      draftAvailable() {
        return this.roomState.players.length;
      },
      // Player has already chosen name
      inputDisabled() {
        return this.roomState.players
          .find(({ name }) => name === this.playerName);
      },
      ownedPlayer() {
        const player = this.roomState.players
          .find(({ name }) => name === this.playerName);

        return player ? player.name : '';
      },
      isActivePlayer() {
        return this.playerName === this.roomState.activePlayer;
      },
    },
    data() {
      return {
        playerName: '',
        // room: 'awesome-superb-penguin',
        roomState: {
          players: [],
          characters: [],
          activePlayer: '',
          draftStarted: false,
        },
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
  @import '../assets/scss/app';
</style>
