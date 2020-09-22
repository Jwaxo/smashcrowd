import React, { Component } from 'react';
import Player from './Player';
import FormAddPlayer from './FormAddPlayer';

class Players extends Component {

  constructor(props) {
    super(props);
    this.state = {currentPlayer: this.props.currentPlayer};
  }

  render() {
    const { players, canAddPlayer, isLoggedIn, currentPlayer, socket } = this.props;

    return (
      <div className="grid-x grid-margin-x">
        {players ? players.map((playerInfo) => {
          let playerCard = '';
          if (playerInfo) {
            playerCard = (
              <div
                className="cell small-6 medium-4 large-auto"
                key={playerInfo.playerId}
              >
                <Player
                  player={playerInfo}
                  current={currentPlayer !== null && currentPlayer.playerId === playerInfo.playerId}
                  isLoggedIn={isLoggedIn}
                  socket={socket}
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
