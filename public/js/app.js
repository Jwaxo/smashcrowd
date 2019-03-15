$(document).foundation();

$(function() {
  const socket = io();
  let client = {};

  characterSetup(true);
  playerSetup(true);
  playerFormSetup(true);
  boardSetup(true);

  socket.on('set-client', newClient => {
    client = newClient;
  });

  socket.on('rebuild-players', html => {
    const playerContainer = $('#players_container');
    playerContainer.html(html);
    playerSetup();
  });

  socket.on('rebuild-player-form', (html) => {
    const playerFormContainer = $('#add_player_form_container');
    playerFormContainer.html(html);
    playerFormSetup();
  });

  socket.on('rebuild-characters', html => {
    const charactersContainer = $('#characters_container');
    charactersContainer.html(html);
    characterSetup();
  });

  socket.on('rebuild-chat', html => {
    const chatContainer = $('#chat_container');
    chatContainer.html(html);
  });

  socket.on('rebuild-boardInfo', html => {
    const boardInfoContainer = $('#board_info_container');
    boardInfoContainer.html(html);
    boardSetup();
  });

  /**
   * Adds a status message to the client's status box.
   *
   * @params {string} html
   *   The HTML of the status message. This should contain everything: the
   *   message, the container, etc.
   */
  socket.on('set-status', html => {
    const statusContainer = $('#status_container');
    statusContainer.append(html);
    $('.status').delay(5000).fadeOut(300);
  });

  /**
   * Updates the player list based off of an array of players and the data to change.
   *
   * @params {array} players
   *   An array of players to update. Note that a player missing from this array
   *   doesn't mean the player will be deleted, merely that there is no necessary
   *   change.
   *   Possible parameters:
   *   - {integer} clientId: the client that currently owns this player.
   *   - {boolean} isActive: whether or not this player has pick.
   *   - {string} rosterHTML: the rendered HTML for the given player's list of
   *     characters.
   */
  socket.on('update-players', players => {
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const $player = $('.player[data-player-id="' + player.playerId + '"]');

      if (player.hasOwnProperty('clientId')) {
        // Make sure unowned players don't have the owned tag.
        if (player.clientId === 0) {
          $player.removeClass('player--owned');
        }
        else {
          $player.addClass('player--owned');
        }

        if (player.clientId === client.id) {
          setPlayerCurrent($player);
        }
        else {
          removePlayerCurrent($player);
        }
      }

      if (player.hasOwnProperty('isActive')) {
        if (player.isActive) {
          $player.addClass('player--active');
        }
        else {
          $player.removeClass('player--active');
        }
      }

      if (player.roster_html) {
        $player.find('.player-roster-container').html(player.roster_html);
      }
    }
    playerSetup();
  });

  /**
   * Updates the character select area based off of the characters in an array.
   *
   * @params {object} character_data
   *   @see index.js:updateCharacters() for full parameters.
   */
  socket.on('update-characters', character_data => {
    if (character_data.hasOwnProperty('allDisabled')) {
      $('.character-grid').toggleClass('character-grid--disabled', character_data.allDisabled);
    }

    if (character_data.hasOwnProperty('chars')) {
      for (let i = 0; i < character_data.chars.length; i++) {
        const charId = character_data.chars[i].charId;
        const disabled = character_data.chars[i].disabled;

        if (disabled) {
          $('.character-grid .character[data-character-id="' + charId + '"]').addClass('character--disabled');
        }
      }
    }
  });

  /**
   * Updates the system and chat box.
   *
   * @params {string} html
   *   The complete HTML of the contained chat item.
   */
  socket.on('update-chat', html => {
    const chatContainer = $('.chat-box');
    chatContainer.prepend(html);
    chatContainer.foundation();
  });

  /**
   * Resets the entire board: players, rosters, and characters chosen.
   */
  $('form[name="new-board"]').submit((e) => {
    e.preventDefault();
    const form = $(event.currentTarget);
    const boardModal = $('#modal_new_board');
    const data = {};
    if (form.find('input[name="draft-type"]:checked')) {
      data.draftType = form.find('input[name="draft-type"]:checked').val();
    }
    if (form.find('input[name="rounds"]')) {
      data.totalRounds = form.find('input[name="rounds"]').val();
    }

    // This will need to be replaced with a proper New Board functionality once
    // we have multiple boards set up.
    socket.emit('reset', data);
    boardModal.foundation('close');
  });

  /**
   * Needs to be run any time the character grid gets recreated, so the jQuery
   * events properly attach.
   */
  function characterSetup(initial = false) {
    $('.character-grid .character').unbind('click').click((element) => {
      const charId = $(element.currentTarget).data('character-id');
      socket.emit('add-character', charId);
    });

    if (!initial) {
      $('#characters_container').foundation();
    }
  }

  /**
   * Needs to be run any time the player list gets recreated.
   */
  function playerSetup(initial = false) {
    if (client.playerId !== null) {
      const $player = $('.player[data-player-id="' + client.playerId + '"]');
      setPlayerCurrent($player);
    }

    $('.player-picker').unbind('click').click(element => {
      const playerId = $(element.currentTarget).data('player-pick-id');
      socket.emit('pick-player', playerId);
    });

    $('.player .character').unbind('click').click(element => {
      const $character = $(element.currentTarget);
      const $player = $character.closest('.player');
      socket.emit('player-character-click', $character.data('character-id'), $character.data('character-round'), $player.data('player-id'));
    });

    if (!initial) {
      $('#players_container').foundation();
    }
  }

  /**
   * Needs to be run any time the player form gets recreated.
   */
  function playerFormSetup(initial = false) {
    $('.player-add-form').unbind('submit').submit(event => {
      event.preventDefault();
      const field = $('.player-add');
      socket.emit('add-player', field.val());
      field.val('');
    });
  }

  /**
   * Needs to be run any time the general board info updates.
   */
  function boardSetup(initial = false) {
    const boardInfoContainer = $('#board_info_container');

    /**
     * Shuffles the current players.
     */
    $('#randomize').unbind('click').click(() => {
      socket.emit('players-shuffle');
    });

    /**
     * Starts the character picking process.
     */
    $('#start_picking').unbind('click').click(() => {
      socket.emit('start-draft');
    });

    /**
     * Starts the round-tracking process.
     */
    $('#start_game').unbind('click').click(() => {
      socket.emit('start-game');
    });

    if (!initial) {
      boardInfoContainer.foundation();
    }
  }

  /**
   * Does some setup for if a player is current, since the browser is holding
   * client information.
   * @param $player
   */
  function setPlayerCurrent($player) {
    $player.addClass('player--current');
    $player.find('.player-picker').addClass('hollow').html('This is you');
  }

  /**
   * The opposite of the above function; should remove classes and reset HTML.
   * @param $player
   */
  function removePlayerCurrent($player) {
    $player.removeClass('player--current');
    $player.find('.player-picker').removeClass('hollow').html('Be This Player');

  }
});
