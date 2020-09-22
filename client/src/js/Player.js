import React, { Component } from 'react';
import PlayerCharacters from './PlayerCharacters';

class Player extends Component {

  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(e) {
    this.props.handlePlayerChange(parseInt(e.target.dataset.playerPickId));
  }

  render() {
    const { player, current, isLoggedIn } = this.props;
    const { name, active, id, clientId, displayOrder, userId } = player;

    const playerClasses = [
      'player',
      `player--player${displayOrder}`,
      active ? 'player--active' : null,
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
          data-player-pick-id={ player.playerId }
          onClick={this.handleChange}
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
      <div className={playerClasses}
           data-player-id={id}
           data-client-id={clientId}>
        <div className="player-content">
          <div className="card-section">

            <h4>{name}</h4>

            <div className="player-picker-outer">
              { playerPickButtons }
            </div>

            { playerScore }

            <div className="player-roster-container">
              <PlayerCharacters characters={player.characters} />
            </div>
          </div>

          <button className="close-button player-close"
                  aria-label="Remove this player" type="button" data-close>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      </div>
    )
  }

}

export default Player;
