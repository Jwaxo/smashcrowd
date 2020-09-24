import React, { Component } from 'react';
import Character from './Character';

class PlayerCharacters extends Component {

  playerCharacterClick = (characterId, round) => {
    const { socket, playerId } = this.props;
    socket.emit('player-character-click', characterId, round, playerId)
  };

  render() {
    const { characters, draftRound, gameRound } = this.props;

    const playerRosterClasses = [
      'player-roster',
      characters.length < 1 ? 'player-roster--empty' : null,
    ].filter(classString => (classString != null)).join(' ');

    return (
      <div className={playerRosterClasses}>
        {characters.map((character, index) => {
          const rosterKey = index + 1;
          const disabled = (gameRound > 0 && rosterKey !== gameRound) || (draftRound > 0 && rosterKey !== draftRound);
          // console.log(character.name);
          // console.log(`(${gameRound} > 0 && ${rosterKey} !== ${gameRound}) || (${draftRound} > 0 && ${rosterKey} !== ${draftRound})`);
          return (
            <Character
              character={character}
              round={rosterKey}
              key={rosterKey}
              disabled={disabled}
              onCharacterClick={this.playerCharacterClick}
            />
          )
        })}
      </div>
    )
  }

}

export default PlayerCharacters;
