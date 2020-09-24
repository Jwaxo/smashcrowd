import React, { Component } from 'react';

class FormAddPlayer extends Component {

  constructor(props) {
    super(props);

    this.state = {
      value: '',
    }
  }

  handleSubmit = (e) => {
    const { addPlayer } = this.props;
    const { value } = this.state;

    e.preventDefault();

    addPlayer(value);

    this.setState({value: ''});
  };



  render() {
    return (
      <div className='player-wrapper'>
        <div className="card player player--new">
          <div className="card-section">
            <h4>&nbsp;</h4>
            {!this.props.isLoggedIn ? (
            <form className="player-add-form" onSubmit={this.handleSubmit}>
              <input
                className="player-add"
                tabIndex="1"
                type="text"
                placeholder="Join anonymously"
                onChange={(e) => this.setState({value: e.target.value})}
                value={this.state.value}
              />
            </form>
            ) : (
            <form className="player-join-form">
              <button className="player-join button expanded" tabIndex="1">Join
                Board
              </button>
            </form>
            )}
          </div>
        </div>
      </div>
    )
  }
}

export default FormAddPlayer;
