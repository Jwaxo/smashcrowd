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

  $('#add_player_form').submit(() => {
    event.preventDefault();
    const field = $(this).find('#add_player');
    socket.emit('add-player', field.val());
    field.val('');
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
    })
  }
});
