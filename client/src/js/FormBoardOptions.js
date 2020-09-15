import React, { Component } from 'react';

class FormBoardOptions extends Component {
  render() {
    const { draftTypes, defaultRounds } = this.props;

    return (

      <form name="new-board">

        <div className="form-options">
          <p>Select the type of draft:</p>
          { draftTypes ? draftTypes.map((draftType) => (
              <label><input type="radio" name="draft-type" value={draftType.machine_name} required />{draftType.label}</label>
            )
          ) : ''}
        </div>

        <div className="form-options">
          <p>How many rounds? Leave blank for unlimited.</p>
          <div className="grid-x grid-padding-x">
            <div className="cell small-3">
              <label htmlFor="rounds" className="text-right">Rounds</label>
            </div>
            <div className="cell small-6">
              <input name="rounds" type="number" min="0" step="1"
                     value={ defaultRounds } />
            </div>
          </div>
        </div>

        <button type="submit" className="button submit">Submit</button>

      </form>
    )
  }
}

export default FormBoardOptions;
