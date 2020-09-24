import React, { Component } from 'react';

class FormBoardOptions extends Component {

  constructor(props) {
    super(props);

    this.handleSubmit = this.handleSubmit.bind(this);

    this.state = {
      newDraftType: props.currentDraftType,
      newRounds: props.defaultRounds,
    }
  }

  handleSubmit(e) {
    const { socket, newGame } = this.props;
    const { newDraftType, newRounds } = this.state;

    e.preventDefault();

    const data = {
      draftType: newDraftType,
      totalRounds: newRounds,
    };

    // This will need to be replaced with a proper New Board functionality once
    // we have multiple boards set up.
    socket.emit('reset', data);

    newGame();
  }

  render() {
    const { draftTypes } = this.props;
    const { newDraftType, newRounds} = this.state;

    return (

      <form name="new-board" onSubmit={this.handleSubmit}>

        <div className="form-options">
          <p>Select the type of draft:</p>
          { draftTypes ? draftTypes.map((draftType) => (
            <label key={draftType.machine_name}><input
              type="radio"
              checked={newDraftType === draftType.machine_name}
              name="draft-type"
              value={draftType.machine_name}
              required
              onChange={(e) => {this.setState({newDraftType: e.target.value})}}
            />{draftType.label}</label>
          )) : ''}
        </div>

        <div className="form-options">
          <p>How many rounds? Leave blank for unlimited.</p>
          <div className="grid-x grid-padding-x">
            <div className="cell small-3">
              <label htmlFor="rounds" className="text-right">Rounds</label>
            </div>
            <div className="cell small-6">
              <input
                name="rounds"
                type="number"
                min="0"
                step="1"
                value={ newRounds }
                onChange={(e) => {this.setState({newRounds: e.target.value})}}
              />
            </div>
          </div>
        </div>

        <button type="submit" className="button submit">Submit</button>

      </form>
    )
  }
}

export default FormBoardOptions;
