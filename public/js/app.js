$(document).foundation();

$(function() {
  const socket = io();
  let client = {};

  characterSetup(true);
  playerSetup(true);
  playerFormSetup(true);
  boardSetup(true);
  userToolbarSetup(true);

  /**
   * We've been registered as a new connection, or are updating a current one.
   */
  socket.on('set-client', (newClient, isUpdate) => {
    client = newClient;

    if (!isUpdate) {
      const playerId = localStorage.getItem(client.playerStorage);

      // Check for a playerId cookie for this specific game board. Since cookies
      // are strings, this will return TRUE even if '0'.
      if (playerId !== null) {
        socket.emit('pick-player', parseInt(playerId));
      }
    }
  });

  socket.on('rebuild-players', html => {
    const playerContainer = $('#players');
    playerContainer.html(html);
    playerSetup();
  });

  socket.on('rebuild-player-form', (html) => {
    const playerFormContainer = $('#add_player_form_container');
    playerFormContainer.html(html);
    playerFormSetup();
  });

  socket.on('rebuild-characters', html => {
    const charactersContainer = $('#characters');
    charactersContainer.html(html);
    characterSetup();
  });

  socket.on('rebuild-stages', html => {
    const stagesContainer = $('#stages');
    stagesContainer.html(html);
    stagesSetup();
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

  socket.on('rebuild-usertoolbar', html => {
    const userToolbarContainer = $('#user_toolbar_container');
    userToolbarContainer.html(html);
    userToolbarSetup();
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
    statusContainer.last().foundation();
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

    characterSetup();
  });

  /**
   * Updates the stage select area with new rendered stage info.
   *
   * @params {string} html
   *   The replacement HTML with new stage data.
   * @params {int} stageId
   *   The ID of the stage to replace.
   */
  socket.on('update-stage', (html, stageId) => {
    const stagesGrid = $('.stages-grid');
    const stage = stagesGrid.find('[data-stage-id="' + stageId + '"]');
    stage.replaceWith(html);
    stagesGrid.removeClass('stages-grid--disabled');
    stagesSetup();
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
   * User attempts a login.
   */
  $('form[name="user-login"]').submit((e) => {
    e.preventDefault();
    const form = $(event.currentTarget);
    const errorContainer = form.find('.error-container');
    const data = {
      username: form.find('input[name="username"]').val(),
      password: form.find('input[name="password"]').val(),
    };

    socket.emit('user-login', data);
  });

  socket.on('form-user-login-error', error => {
    const form = $('form[name="user-login"]');
    const errorContainer = form.find('.error-container');

    for (let field of error.elements) {
      form.find(`input[name="${field}"]`).addClass('invalid');
    }
    errorContainer.html(error.message);
  });

  socket.on('form-user-login-complete', user => {
    const loginModal = $('#modal_user_login');
    loginModal.foundation('close');
  });

  /**
   * Register a new user.
   */
  $('form[name="new-user"]').submit((e) => {
    e.preventDefault();
    const form = $(event.currentTarget);
    const errorContainer = form.find('.error-container');
    const data = {
      username: form.find('input[name="username"]').val(),
      email: form.find('input[name="email"]').val(),
      password1: form.find('input[name="password1"]').val(),
      password2: form.find('input[name="password2"]').val(),
    };
    const error = {};

    if (data.password1 !== data.password2) {
      error.elements = ['password1', 'password2'];
      error.message = "Please verify that your passwords match.";
    }
    else if (data.password1.length < 12) {
      error.elements = ['password1', 'password2'];
      error.message = "Please ensure that your password is at least 12 characters long.";
    }

    if (error.elements) {
      for (let field of error.elements) {
        form.find(`input[name="${field}"]`).addClass('invalid');
      }
      errorContainer.html(error.message);
      return false;
    }
    else {
      socket.emit('register-user', data);
    }
  });

  socket.on('form-user-register-error', error => {
    const form = $('form[name="new-user"]');
    const errorContainer = form.find('.error-container');

    for (let field of error.elements) {
      form.find(`input[name="${field}"]`).addClass('invalid');
    }
    errorContainer.html(error.message);
  });

  socket.on('form-user-register-complete', user => {
    const registerModal = $('#modal_user_register');
    registerModal.foundation('close');
  });

  /**
   * Needs to be run any time the user toolbar gets recreated, so the jQuery
   * events properly attach.
   */
  function userToolbarSetup(initial = false) {
    if (!initial) {
      $('#user_toolbar_container').foundation();
    }
  }

  /**
   * Needs to be run any time the character grid gets recreated, so the jQuery
   * events properly attach.
   */
  function characterSetup(initial = false) {
    $('.character-grid:not(.character-grid--disabled) .character').unbind('click').click((element) => {
      const charId = $(element.currentTarget).data('character-id');
      socket.emit('add-character', charId);
      $('.character-grid').addClass('character-grid--disabled', true);
    });

    if (!initial) {
      $('#characters').foundation();
    }
  }

  /**
   * Needs to be run any time the stages grid gets recreated, so the jQuery
   * events properly attach.
   */
  function stagesSetup(initial = false) {
    $('.stages-grid:not(.stages-grid--disabled) .stage').unbind('click').click((element) => {
      const stageId = $(element.currentTarget).data('stage-id');
      socket.emit('click-stage', stageId);
      $('.stages-grid').addClass('stages-grid--disabled', true);
    });

    if (!initial) {
      $('#stages').foundation();
    }
  }

  /**
   * Needs to be run any time the player list gets recreated.
   */
  function playerSetup(initial = false) {
    if (client.playerId !== null) {
      const $player = $('.player[data-player-id="' + client.playerId + '"]');
      setPlayerCurrent($player, client.playerId);
    }

    $('.player-picker').unbind('click').click(element => {
      const playerId = $(element.currentTarget).data('player-pick-id');
      pickPlayer(playerId);
    });

    $('.player-close').unbind('click').click(element => {
      const $player = $(element.currentTarget).closest('.player');
      socket.emit('player-remove-click', $player.data('player-id'));
    });

    $('.player .character').unbind('click').click(element => {
      const $character = $(element.currentTarget);
      const $player = $character.closest('.player');
      socket.emit('player-character-click', $character.data('character-id'), $character.data('character-round'), $player.data('player-id'));
    });

    if (!initial) {
      $('#players').foundation();
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

  function pickPlayer(playerId) {
    localStorage.setItem(client.playerStorage, playerId);
    socket.emit('pick-player', playerId);
  }

  /**
   * Does some setup for if a player is current, since the browser is holding
   * client information.
   * @param $player
   *   jQuery object of the player box.
   * @param {integer} playerId
   *   The player ID.
   */
  function setPlayerCurrent($player, playerId) {
    localStorage.setItem(client.playerStorage, playerId);
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
