import React, { Component } from 'react';
import PlayerCharacters from './PlayerCharacters';

class Player extends Component {

  pickPlayer = () => {
    const { player, socket } = this.props;
    socket.emit('pick-player', player.playerId);
  };

  closePlayer = () => {
    //@todo: ensure only the player or the board owner can remove an unowned
    //  player.
    const { player, socket } = this.props;
    socket.emit('player-remove-click', player.playerId);
  };

  render() {
    const { player, current, isLoggedIn, socket, gameRound, draftRound } = this.props;
    const { name, isActive, id, clientId, displayOrder, userId, playerId } = player;

    const playerWrapperClasses = [
      'player-wrapper',
      isActive ? 'player-wrapper--active' : null,
    ].filter(classString => (classString != null)).join(' ');

    const playerClasses = [
      'player',
      `player--player${displayOrder}`,
      isActive ? 'player--active' : null,
      id ? 'player--owned' : null,
      current ? 'player--current' : null,
    ].filter(classString => (classString != null)).join(' ');

    let playerPickButtons = '';
    let playerScore = '';

    if (current) {
      playerPickButtons = (
        <button
          className="player-picker button hollow"
          data-player-pick-id={ player.playerId }
          tabIndex="2"
        >
          This is You
        </button>
      )
    } else if (!clientId && !userId && !isLoggedIn) {
      playerPickButtons = (
        <button
          className="player-picker button"
          data-tooltip
          tabIndex="2"
          title="Select this player to start picking characters for them."
          data-position="top" data-alignment="center"
          onClick={this.pickPlayer}
        >
          Be This Player
        </button>
      )
    }

    if (player.stats.hasOwnProperty('game_score')) {
      playerScore = (
        <div className="player-score">
          <h4>Wins: {player.stats.game_score}</h4>
        </div>
      );
    }
    
    return (
      <div className={playerWrapperClasses}>
        <div className={playerClasses}
           data-player-id={id}
           data-client-id={clientId}>
          <div className="card-section">

            <h4>{name}</h4>

            <div className="player-picker-outer">
              { playerPickButtons }
            </div>

            { playerScore }

            <div className="player-roster-container">
              <PlayerCharacters
                characters={player.characters}
                playerId={playerId}
                socket={socket}
                gameRound={gameRound}
                draftRound={draftRound}
              />
            </div>
          </div>

          <button
            className="close-button player-close"
            aria-label="Remove this player"
            type="button"
            onClick={this.closePlayer}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      </div>
    )
  }

}

export default Player;
