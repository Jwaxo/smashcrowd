import React, { Component } from 'react';

class Character extends Component {

  handleClick = (e) => {
    const { character, round } = this.props;
    // Since the context of where this character icon appears could be either in
    // the character select screen or on a player's roster, we need to let the
    // parent context handle what happens.
    this.props.onCharacterClick(character.charId, round);
  };

  render() {
    const { character, disabled } = this.props;
    const { name, charId, image, state, active } = character;

    const characterClasses = [
      'character',
      state ? `character--${state}` : null,
      disabled && state !== 'win' ? 'character--disabled' : null,
      active && charId !== 999 ? 'character--active' : null,
    ].filter(classString => (classString != null)).join(' ');

    const characterStyles = {
      backgroundImage: image ? `url(${process.env.PUBLIC_URL}/${image})` : null,
      backgroundColor: image ? "#FFFFFF" : null,
    };

    return (
      <div className={ characterClasses }
       style={ characterStyles }
       onClick={this.handleClick}
      >
        <span className="character-name">{name}</span>
      </div>
    )
  }

}

export default Character;
