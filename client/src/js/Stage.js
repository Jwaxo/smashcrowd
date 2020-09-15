import React, { Component } from 'react';

class Stage extends Component {

  render() {
    const { id, name, disabled, active, state, image, players } = this.props;

    const stageClasses = [
      'stage',
      disabled ? 'stage--disabled' : null,
      active ? 'stage--active' : null,
      state ? `stage--${state}` : null,
    ].filter(classString => (classString != null)).join(' ');

    const stageStyles = {
      backgroundImage: image ? `url(${process.env.PUBLIC_URL}/${image})` : null,
      backgroundColor: image ? "#FFFFFF" : null,
    };

    let tokens = [];

    if (players.hasOwnProperty('map')) {

      tokens = players.map((player) => {
        const tokenClasses = [
          'stage-token',
          `stage-token--slot${player.slot}`,
          `stage-token--player${player.displayOrder}`,
        ].join(' ');
        return (
          <span className={tokenClasses}><span
            className="stage-token-inner"></span></span>
        );
      });

    }

    return (
      <div className={ stageClasses }
           data-stage-id={ id }
           style={ stageStyles }>
        {tokens}
        <span className="stage-name">{name}</span>
      </div>
    )
  }

}

export default Stage;
