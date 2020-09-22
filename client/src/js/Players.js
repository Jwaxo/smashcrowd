import React, { Component } from 'react';
import Player from './Player';
import FormAddPlayer from './FormAddPlayer';

class Players extends Component {

  constructor(props) {
    super(props);
    this.handlePlayerChange = this.handlePlayerChange.bind(this);
    this.state = {currentPlayer: this.props.currentPlayer};
  }

  handlePlayerChange(playerId) {
    this.props.handlePlayerChange(playerId);
  }

  render() {
    const { players, canAddPlayer, isLoggedIn, currentPlayer } = this.props;

    return (
      <div className="grid-x grid-margin-x">
        {players ? players.map((playerInfo) => {
          let playerCard = '';
          if (playerInfo) {
            playerCard = (
              <div class="cell small-6 medium-4 large-auto">
                <Player
                  player={playerInfo}
                  key={playerInfo.playerId}
                  current={currentPlayer !== null && currentPlayer.playerId === playerInfo.playerId}
                  handlePlayerChange={this.handlePlayerChange}
                  isLoggedIn={isLoggedIn}
                />
              </div>
            )
          }
          return playerCard;
        }) : ''}
        {canAddPlayer ? (
          <div className="cell small-6 medium-3 large-auto">
            <FormAddPlayer isLoggedIn={isLoggedIn }/>
          </div>
        ) : ''}
      </div>
    )
  }

}

export default Players;
