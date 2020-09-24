import React, { Component } from 'react';
import Character from './Character';

class PlayerCharacters extends Component {

  playerCharacterClick = (characterId, round) => {

  };

  render() {
    const { characters } = this.props;

    const playerRosterClasses = [
      'player-roster',
      characters.length < 1 ? 'player-roster--empty' : null,
    ].filter(classString => (classString != null)).join(' ');

    return (
      <div className={playerRosterClasses}>
        {characters.map((character) => (
          <Character
            character={character}
            key={character.charId}
            onCharacterClick={this.playerCharacterClick}
          />
        ))}
      </div>
    )
  }

}

export default PlayerCharacters;
