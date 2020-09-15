import React, { Component } from 'react';
import Player from './Player';
import FormAddPlayer from './FormAddPlayer';

class Players extends Component {

  render() {
    const { players, player, canAddPlayer, isLoggedIn } = this.props;

    return (
      <div className="grid-x grid-margin-x">
        {players ? players.map((playerInfo) => {
          if (player) {
            return (
              <Player
                player={playerInfo}
                current={player.id === playerInfo.id}
                isLoggedIn={isLoggedIn}
              />
            )
          }
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
