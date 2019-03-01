$(document).foundation();

$(function() {
  const socket = io();

  socket.on('rebuild-players', html => {
    const playerContainer = $('#players_container');
    playerContainer.html(html);
  });

  $('#add_player_form').submit(() => {
    event.preventDefault();
    const field = $(this).find('#add_player');
    socket.emit('add-player', field.val());
    field.val('');
  });
});
