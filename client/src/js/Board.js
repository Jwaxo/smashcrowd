import React, { Component } from 'react';
import { Link } from "@reach/router";

import BoardStatus from "./BoardStatus";
import Characters from "./Characters";
import Players from "./Players";
import Stages from "./Stages";
import Chatbox from "./Chatbox";
import Status from "./Status";

class Board extends Component {

  constructor(props) {
    super(props);

    this.handlePlayerChange = this.handlePlayerChange.bind(this);
    this.state = {
      label: props.label ?? 'default',
      draftType: props.draftType ?? 'free',
      status: props.status ?? 'new',
      totalRounds: props.totalRounds ?? 0,
      draftRound: props.draftRound ?? 0,
      gameRound: props.gameRound ?? 0,
      activeTab: props.activeTab ?? 'characters',
    }
  }

  changeTab(newTab) {
    this.setState({activeTab: newTab});
  };

  handlePlayerChange(playerId) {
    this.props.handlePlayerChange(playerId);
  }

  render() {

    const { board, client, characters, stages, players, chat, alerts, currentPlayer } = this.props;
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

          <BoardStatus board={board} />
        </div>

        <ul className="tabs">
          { tabs }
        </ul>

        <div className="tabs-content grid-x grid-margin-x">
          <div className={`tabs-panel ${activeTab === 'characters' ? 'is-active' : ''}`}>
            <Characters characters={characters} disabled={status === 'draft'} hidden={status === 'game'} />
          </div>
          <div className={`tabs-panel ${activeTab === 'stages' ? 'is-active' : ''}`}>
            <Stages stages={stages} disabled={status === 'game' || currentPlayer === null} player={currentPlayer} />
          </div>
        </div>

        <Players
          players={players}
          currentPlayer={currentPlayer}
          canAddPlayer={draftRound < 1 && currentPlayer == null}
          isLoggedIn={client.isLoggedIn}
          handlePlayerChange={this.handlePlayerChange}
        />

        <Chatbox chat={chat} />

        { alerts.length > 0 ? alerts.map((alert, index) => {
          return (
            <Status key={index} type={alert.type} message={alert.status} />
          )
        }) : ''}

      </div>
    )
  }
}

export default Board;
