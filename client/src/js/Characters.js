import React, { Component } from 'react';
import Character from "./Character";

class Characters extends Component {

  render() {

    const gridClasses = [
      'character-grid',
      this.props.disabled ? 'character-grid--disabled ' : null,
      this.props.hidden ? 'character-grid--hidden' : null,
    ].filter(classString => (classString != null)).join(' ');

    return (
      <div className="cell">
        <div className={gridClasses}>
          {this.props.characters ? this.props.characters.map((character) => {
            if (character) {
              return (<Character
                  character={character}
                  key={character.charId}
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
