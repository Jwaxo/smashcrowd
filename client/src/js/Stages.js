import React, { Component } from 'react';
import Stage from './Stage';

class Stages extends Component {

  render() {
    const gridClasses = [
      'stages-grid',
      this.props.disabled ? 'stages-grid--disabled ' : null,
      this.props.hidden ? 'stages-grid--hidden' : null,
    ].filter(classString => (classString != null)).join(' ');

    const { stages, player } = this.props;

    return (

      <div className="cell">
        <div className={gridClasses}>
          {stages ? stages.map((stage) => {
            if (stage) {
              return (<Stage
                  name={stage.name}
                  id={stage.stageId}
                  key={stage.stageId}
                  players={stage.players}
                  // active={player.stages !== null && player.stages.hasOwnProperty(stage.stageId)}
                  image={stage.image}
                  state={stage.state}
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

export default Stages;
