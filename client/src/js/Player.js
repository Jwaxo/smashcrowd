import React, { Component } from 'react';
import PlayerCharacters from './PlayerCharacters';

class Player extends Component {

  render() {
    const { player, current, isLoggedIn } = this.props;
    const { name, active, id, clientId, displayOrder, userId } = player;

    const playerClasses = [
      'card',
      'player',
      `player--player${displayOrder}`,
      active ? 'player--active' : null,
      id ? 'player--owned' : null,
      current ? 'player--current' : null,
    ].filter(classString => (classString != null)).join(' ');
    
    return (
      <div className={playerClasses}
           data-player-id={id}
           data-client-id={clientId}>
        <div className="card-section">
          <h4>{name}</h4>

          <div className="player-picker-outer">
            { () => {
              if (current) {
                return (
                  <button className="player-picker button expanded hollow"
                        data-player-pick-id="{{ player.getId() }}"
                        tabIndex="2">This
                    is You
                  </button>
                )
              } else if (!clientId && !userId && !isLoggedIn) {
                return (
                  <button className="player-picker button expanded" data-tooltip
                          tabIndex="2"
                          title="Select this player to start picking characters for them."
                          data-position="top" data-alignment="center"
                          data-player-pick-id="{{ player.getId() }}">Be This
                    Player
                  </button>
                )
              } } }
          </div>

          <div className="player-score">
            <h4>Wins: {player.stats.game_score}</h4>
          </div>

          <div className="player-roster-container">
            <PlayerCharacters characters={player.characters} />
          </div>
        </div>

        <button className="close-button player-close"
                aria-label="Remove this player" type="button" data-close>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    )
  }

}

export default Player;