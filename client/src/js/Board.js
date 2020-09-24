import React, { Component } from 'react';
import { Link } from "@reach/router";

import BoardStatus from "./BoardStatus";
import Characters from "./Characters";
import Players from "./Players";
import Stages from "./Stages";
import Chatbox from "./Chatbox";
import Alert from "./Alert";

class Board extends Component {

  boardStates = {
    label: 'name',
    draftType: 'draft_type',
    status: 'status',
    totalRounds: 'total_rounds',
    draftRound: 'current_draft_round',
    gameRound: 'game_round',
  };

  constructor(props) {
    super(props);

    // Set defaults on any states if they aren't in the board prop.
    this.state = {
      label: props.board.name ?? 'default',
      draftType: props.board.draft_type ?? 'free',
      status: props.board.status ?? 'new',
      totalRounds: props.board.total_rounds ?? 0,
      draftRound: props.board.current_draft_round ?? 0,
      gameRound: props.board.current_game_round ?? 0,
      activeTab: props.activeTab ?? 'characters',
    };
  }

  componentDidUpdate(prevProps, prevState, snapshot) {

    // If anything in the board prop was updated, we need to update the Board's
    // states.
    for (const boardState in this.boardStates) {
      const boardProp = this.boardStates[boardState];
      if (this.props.board[boardProp] !== prevProps.board[boardProp]) {
        this.setState({[boardState]: this.props.board[boardProp]});
      }
    }
  }

  changeTab(newTab) {
    this.setState({activeTab: newTab});
  };

  render() {

    const { board, client, characters, stages, players, chat, alerts, currentPlayer, socket } = this.props;
    const { status, draftRound, activeTab } = this.state;

    const tabs = [
      'Characters',
      'Stages',
    ].map((tab) => {
      const value = tab.toLowerCase();
      const isActive = activeTab === value;
      return (<li
        className={`tabs-title ${isActive ? 'is-active' : ''}`}
        key={tab}
      >
        <Link to={`#${value}`} onClick={() => this.changeTab(value)} aria-selected={isActive ? 'true' : 'false'}>
          {tab}
        </Link>
      </li>
    )});

    return (
      <div>
        <div className="grid-x grid-margin-x">
          <div className="cell medium-6 large-4">
            <h1>SmashCrowd</h1>
            <p>Draft your next online Smashdown!</p>
          </div>
          <div className="cell medium-6 large-4">
            <em>Notice a bug or want to request a feature? Check our <Link to="https://github.com/Jwaxo/smashcrowd/issues" target="_blank">Issue
              Queue!</Link></em>
          </div>

          <BoardStatus board={board} socket={socket} />
        </div>

        <ul className="tabs">
          { tabs }
        </ul>

        <div className="tabs-content grid-x grid-margin-x">
          <div className={`tabs-panel ${activeTab === 'characters' ? 'is-active' : ''}`}>

            <Characters characters={characters} disabled={status !== 'draft'} hidden={status === 'game'} socket={socket} />

          </div>
          <div className={`tabs-panel ${activeTab === 'stages' ? 'is-active' : ''}`}>

            <Stages stages={stages} disabled={status === 'game' || currentPlayer === null} player={currentPlayer} socket={socket} />

          </div>
        </div>

        <Players
          players={players}
          currentPlayer={currentPlayer}
          canAddPlayer={draftRound < 1 && client.boards == null}
          isLoggedIn={client.isLoggedIn}
          socket={socket}
        />

        <Chatbox chat={chat} />

        <div className='status-box'>
          { alerts.length > 0 ? alerts.map((alert, index) => {
            return (
              <Alert key={index} type={alert.type} message={alert.status} />
            )
          }) : ''}
        </div>

      </div>
    )
  }
}

export default Board;
