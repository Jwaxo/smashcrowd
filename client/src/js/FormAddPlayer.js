import React, { Component } from 'react';

class FormAddPlayer extends Component {
  render() {
    return (
      <div className='player-wrapper'>
        <div className="card player player--new">
          <div className="card-section">
            {this.props.isLoggedIn ? (
            <form className="player-add-form">
              <input className="player-add" tabIndex="1" type="text"
                     placeholder="Join anonymously" />
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
