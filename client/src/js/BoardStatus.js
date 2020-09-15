import React, { Component } from 'react';

class BoardStatus extends Component {

  newBoardModal = () => {

  };

  render() {
    const board = this.props.board;
    let statusString = '';

    // Determine the status based off of our drafting and game status.
    switch (board.status) {
      case "new":
        statusString = (
          <h4 className="warning">Waiting to Start { board.totalRounds ? `${board.totalRounds} Round ` : '' }Draft</h4>
        );

        break;

      case 'draft':
        if (board.draftType === 'free') {
          statusString = (
            <h4>Please Draft { board.totalRounds ? board.totalRounds : 'Your' } Characters</h4>
          );
        }
        else {
          statusString = (
            <h4>Draft Round: {board.draftRound}{ board.totalRounds ? ` out of ${board.totalRounds}` : '' }</h4>
          );
        }

        break;

      case 'draft-complete':
        statusString = (
          <h4>Draft Complete!</h4>
        );

        break;

      case 'game':
        statusString = (
          <h4>Game Round: {board.gameRound}{ board.totalRounds ? ` out of ${board.totalRounds}` : ''}</h4>
        );

        break;

      case 'game-complete':
        statusString = (
          <h4>Game Complete!</h4>
        );

        break;

      default:
        statusString = (
          <h4>Error</h4>
        );

        break;
    }

    return (
      <div className="cell medium-6 large-4">
        <h4>Draft Type: {board.draftType}</h4>
        {statusString}

        <div className="board-options grid-x grid-margin-x">
          <div className="cell auto">
            <button id="reset" onClick={this.newBoardModal} className="reset button">New Board</button>
            { board.status === 'new' ? ([
              <button key="randomize" id="randomize" className="randomize button"
                      title="Randomizes the player order. This option will disappear after picking has begun.">Shuffle
                Players</button>,
              <button key="start_picking" id="start_picking" className="start-draft button" title="Begin the drafting process.">Start Draft</button>
            ]) : (
              <div>
                { !board.totalRounds || board.status === 'draft-complete' ? (
                  <button key="start_game" id = "start_game" className="start-game button" title="Begin going through rounds.">Start Game</button>
                ) : '' }
              </div>
            ) }
          </div>
        </div>
      </div>
    );
  }
}

export default BoardStatus;
