import React, { Component } from 'react';

import Modal from './Modal';
import FormBoardOptions from './FormBoardOptions';

class BoardStatus extends Component {

  constructor(props) {
    super(props);

    this.state = {
      showBoardModal: false,
    };
  }

  toggleBoardModal = () => {
    this.setState({showBoardModal: !this.state.showBoardModal});
  };

  startDraft = () => {
    const { socket } = this.props;
    socket.emit('start-draft');
  };

  render() {
    const { board } = this.props;
    const { showBoardModal } = this.state;
    let statusString = '';

    // Determine the status based off of our drafting and game status.
    switch (board.status) {
      case "new":
        statusString = (
          <h4 className="warning">Waiting to Start { board.total_rounds ? `${board.total_rounds} Round ` : '' }Draft</h4>
        );

        break;

      case 'draft':
        if (board.draft_type === 'free') {
          statusString = (
            <h4>Please Draft { board.total_rounds ? board.total_rounds : 'Your' } Characters</h4>
          );
        }
        else {
          statusString = (
            <h4>Draft Round: {board.current_draft_round}{ board.total_rounds ? ` out of ${board.total_rounds}` : '' }</h4>
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
          <h4>Game Round: {board.current_game_round}{ board.total_rounds ? ` out of ${board.total_rounds}` : ''}</h4>
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
        <div className="board-info">
          <h4>Draft Type: {board.draft_type_label}</h4>
          {statusString}

          <div className="board-options grid-x grid-margin-x">
            <div className="cell auto">
              <button id="reset" onClick={this.toggleBoardModal} className="reset button">New Board</button>
              { board.status === 'new' ? (
                [
                  <button
                    key="randomize"
                    id="randomize"
                    className="randomize button"
                    title="Randomizes the player order. This option will disappear after picking has begun."
                  >Shuffle
                    Players</button>,
                  <button
                    key="start_picking"
                    id="start_picking"
                    className="start-draft button"
                    title="Begin the drafting process."
                    onClick={this.startDraft}
                  >Start Draft</button>
                ]
              ) : (
                <div>
                  { !board.total_rounds || board.status === 'draft-complete' ? (
                    <button
                      key="start_game"
                      id="start_game"
                      className="start-game button"
                      title="Begin going through rounds."
                    >Start Game</button>
                  ) : '' }
                </div>
              ) }
            </div>
          </div>
          { showBoardModal ? (
            <Modal closeFunction={this.toggleBoardModal}>
              <FormBoardOptions draftTypes={board.draftTypes} defaultRounds={board.total_rounds} />
            </Modal>
          ) : null}
        </div>
      </div>
    );
  }
}

export default BoardStatus;
