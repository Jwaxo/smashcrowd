import React, { Component } from 'react';

class Character extends Component {

  render() {
    const { character } = this.props;
    const { name, id, image, disabled, state, active, round } = character;

    const characterClasses = [
      'character',
      `character--${state}`,
      disabled ? 'character--disabled' : null,
      active && id !== 999 ? 'character--active' : null,
    ].filter(classString => (classString != null)).join(' ');

    const characterStyles = {
      backgroundImage: image ? `url(${process.env.PUBLIC_URL}/${image})` : null,
      backgroundColor: image ? "#FFFFFF" : null,
    };

    return (
      <div className={ characterClasses }
           data-character-round={ round ? round : 0 }
           data-character-id={ id }
           style={ characterStyles }>
        <span className="character-name">{name}</span>
      </div>
    )
  }

}

export default Character;
