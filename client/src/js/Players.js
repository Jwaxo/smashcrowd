import React, { Component } from 'react';
import Player from './Player';
import FormAddPlayer from './FormAddPlayer';

class Players extends Component {

  render() {
    const { players, player, canAddPlayer, isLoggedIn } = this.props;

    return (
      <div className="grid-x grid-margin-x">
        {players ? players.map((playerInfo) => {
          let playerCard = '';
          if (player) {
            playerCard = (
              <Player
                player={playerInfo}
                key={playerInfo.playerId}
                current={player.playerId === playerInfo.playerId}
                isLoggedIn={isLoggedIn}
              />
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
