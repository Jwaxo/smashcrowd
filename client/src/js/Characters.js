import React, { Component } from 'react';
import Character from "./Character";

class Characters extends Component {

  onCharacterChoose = (characterId) => {
    const { socket, disabled } = this.props;
    if (!disabled) {
      socket.emit('add-character', characterId);
    }
  };

  render() {

    const { disabled, hidden } = this.props;

    const gridClasses = [
      'character-grid',
      disabled ? 'character-grid--disabled ' : null,
      hidden ? 'character-grid--hidden' : null,
    ].filter(classString => (classString != null)).join(' ');

    const { isLimited, characters } = this.props;

    return (
      <div className="cell">
        <div className={gridClasses}>
          {characters ? characters.map((character) => {
            if (character) {
              return (<Character
                  character={character}
                  key={character.charId}
                  disabled={character.player && isLimited}
                  onCharacterClick={this.onCharacterChoose}
                />
              )
            }
            else return '';
          }) : ''}
        </div>
      </div>
    )
  }

}

export default Characters;
