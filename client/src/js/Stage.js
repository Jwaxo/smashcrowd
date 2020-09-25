import React, { Component } from 'react';

class Stage extends Component {

  handleClick = () => {
    const { id, onStageClick} = this.props;

    onStageClick(id);
  };

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
    const playerKeys = Object.keys(players);

    if (playerKeys.length > 0) {
      tokens = playerKeys.map((playerKey) => {
        const player = players[playerKey];
        const tokenClasses = [
          'stage-token',
          `stage-token--slot${playerKey}`,
          `stage-token--player${player.displayOrder}`,
        ].join(' ');
        return (
          <span
            className={tokenClasses}
            key={playerKey}
          >
            <span className="stage-token-inner"></span>
          </span>
        );
      });

    }

    return (
      <div
        className={ stageClasses }
        data-stage-id={ id }
        style={ stageStyles }
        onClick={this.handleClick}
      >
        {tokens}
        <span className="stage-name">{name}</span>
      </div>
    )
  }

}

export default Stage;
