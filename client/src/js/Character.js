import React, { Component } from 'react';

class Character extends Component {

  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(e) {
    this.props.onCharacterClick(e.target.dataset.characterId);
  }

  render() {
    const { character } = this.props;
    const { name, charId, image, disabled, state, active, round } = character;

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
