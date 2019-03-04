$(document).foundation();

$(function() {
  const socket = io();
  characterSetup();
  playerSetup();

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
    $('.player-picker').click(element => {
      const playerId = $(element.currentTarget).data('player-id');
      socket.emit('pick-player', playerId);
    });

    $('.player-add-form').submit(() => {
      event.preventDefault();
      const field = $('.player-add');
      socket.emit('add-player', field.val());
      field.val('');
    });
  }
});
