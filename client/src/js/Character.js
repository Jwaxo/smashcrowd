import React, { Component } from 'react';

class Character extends Component {

  constructor(props) {
    super(props);
  }

  handleClick = (e) => {
    // Since the context of where this character icon appears could be either in
    // the character select screen or on a player's roster, we need to let the
    // parent context handle what happens.
    this.props.onCharacterClick(e.target.dataset.characterId);
  };

  render() {
    const { character, disabled } = this.props;
    const { name, charId, image, state, active, round } = character;

    const characterClasses = [
      'character',
      `character--${state}`,
      disabled ? 'character--disabled' : null,
      active && charId !== 999 ? 'character--active' : null,
    ].filter(classString => (classString != null)).join(' ');

    const characterStyles = {
      backgroundImage: image ? `url(${process.env.PUBLIC_URL}/${image})` : null,
      backgroundColor: image ? "#FFFFFF" : null,
    };

    return (
      <div className={ characterClasses }
           data-character-round={ round ? round : 0 }
           data-character-id={ charId }
           style={ characterStyles }
           onClick={this.handleClick}
      >
        <span className="character-name">{name}</span>
      </div>
    )
  }

}

export default Character;
