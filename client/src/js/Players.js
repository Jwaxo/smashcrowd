import React, { Component } from 'react';
import Player from './Player';
import FormAddPlayer from './FormAddPlayer';

class Players extends Component {

  constructor(props) {
    super(props);
    this.state = {currentPlayer: this.props.currentPlayer};
  }

  addPlayer = (playerName) => {
    const { socket } = this.props;

    socket.emit('add-player', playerName);
  };

  render() {
    const { players, canAddPlayer, isLoggedIn, currentPlayer, socket, gameRound, draftRound } = this.props;

    return (
      <div className="grid-x grid-margin-x">
        {players ? players.map((playerInfo) => {
          let playerCard = '';
          if (playerInfo) {
            // This player is the current user's player if the current user has
            // chosen a player and that player's ID matches this player's ID.
            // Pretty simple.
            const isCurrent = currentPlayer !== null && currentPlayer.playerId === playerInfo.playerId;

            // This player is OWNED if it has a clientID.
            const isOwned = isCurrent || playerInfo.clientId !== 0;

            playerCard = (
              <div
                className="cell small-6 medium-4 large-auto"
                key={playerInfo.playerId}
              >
                <Player
                  player={playerInfo}
                  current={isCurrent}
                  owned={isOwned}
                  socket={socket}
                  gameRound={gameRound}
                  draftRound={draftRound}
                />
              </div>
            )
          }
          return playerCard;
        }) : ''}
        {canAddPlayer ? (
          <div className="cell small-6 medium-3 large-auto">
            <FormAddPlayer
              isLoggedIn={isLoggedIn }
              addPlayer={this.addPlayer}
            />
          </div>
        ) : ''}
      </div>
    )
  }

}

export default Players;
