$(document).foundation();

$(function() {
  const socket = io();
  let client = {};

  characterSetup();
  playerSetup();

  socket.on('set-client', newClient => {
    client = newClient;
  });

  socket.on('rebuild-players', html => {
    const playerContainer = $('#players_container');
    playerContainer.html(html);
    playerSetup();
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

  socket.on('update-players', players => {
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const $player = $('.player[data-player-id="' + player.playerId + '"]');

      if (player.hasOwnProperty('clientId')) {
        $player.addClass('player--owned');
        if (player.clientId === client.id) {
          $player.addClass('player--current');
        }
        else {
          $player.removeClass('player--current');
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
  });

  socket.on('update-characters', characters => {
    for (let i = 0; i < characters.length; i++) {
      const charId = characters[i].charId;
      const disabled = characters[i].disabled;

      if (disabled) {
        $('.character-grid .character[data-character-id="' + charId + '"]').addClass('character--disabled');
      }
    }
  });

  socket.on('update-chat', html => {
    const chatContainer = $('.chat-box');
    chatContainer.prepend(html);
  });

  $('#reset').click(() => {
    socket.emit('reset');
  });

  /**
   * Needs to be run any time the character grid gets created, so the jQuery
   * events properly attach.
   */
  function characterSetup() {
    $('.character-grid .character').click((element) => {
      const charId = $(element.currentTarget).data('character-id');
      socket.emit('add-character', charId);
    });
  }

  function playerSetup() {
    if (client.playerId !== null) {
      $('.player[data-player-id="' + client.playerId + '"]').addClass('player--current');
    }

    $('.player-picker').click(element => {
      const playerId = $(element.currentTarget).data('player-pick-id');
      socket.emit('pick-player', playerId);
    });

    $('.player-add-form').submit((event) => {
      event.preventDefault();
      const field = $('.player-add');
      socket.emit('add-player', field.val());
      field.val('');
    });
  }
});
