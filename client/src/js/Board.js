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

    /** @todo The following is deprecated; I didn't understand props and state.
     *    However, we need to be sure that the data passed from the server match
     *    these.
     */
    this.state = {
      label: 'default',
      draftType: 'free',
      status: 'new',
      totalRounds: 0,
      draftRound: 0,
      gameRound: 0,
    }

  }

  render() {

    const { board, client, player, characters, stages, players, chat, alerts } = this.props;
    const { status, draftRound } = this.state;

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

        <div className="tabs-content">
          <div id="characters"
               className="grid-x grid-margin-x">
            <Characters characters={characters} disabled={status === 'draft'} hidden={status === 'game'} />
          </div>

          <div id="stages" className="grid-x grid-margin-x">
            <Stages stages={stages} disabled={status === 'game' || player === null} player={player} />
          </div>
        </div>

        <Players players={players} player={player} canAddPlayer={draftRound < 1 && player == null} isLoggedIn={client.isLoggedIn}/>

        <Chatbox chat={chat} />

        { alerts.length > 0 ? alerts.map((alert) => {
          return (
            <Status type={alert.type} message={alert.status} />
          )
        }) : ''}

      </div>
    )
  }
}

export default Board;
