import React, { Component } from 'react';

import UserToolbar from './UserToolbar';
import BoardToolbar from './BoardToolbar';
import Board from './Board';

import socketIOClient from "socket.io-client";
import playerUtilities from "./utils/players";
const socket = socketIOClient();

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {

      // Things nearly universal to all players.
      board: {},
      players: [],
      characters: [],
      stages: [],
      chat: [],
      recaptchaKey: 'recaptcha_key',

      // Things specific to this user.
      client: {},
      user: {},
      player: {},
      alerts: [],
    }
  }

  componentDidMount() {

    socket.on("rebuild-boardInfo", data => {
      this.setState({board: data});
    });

    socket.on("rebuild-players", data => {
      this.setState({players: data});
    });

    socket.on("rebuild-characters", data => {
      this.setState({characters: data});
    });

    socket.on("rebuild-stages", data => {
      this.setState({stages: data});
    });

    socket.on("rebuild-chat", data => {
      this.setState({chat: data});
    });

    socket.on("set-client", (data) => {
      this.setState({client: data});
    });

    socket.on("set-user", data => {
      this.setState({user: data});
    });

    socket.on("set-player", data => {
      const { players, client } = this.state;
      if (data === null) {
        const playerId = parseInt(localStorage.getItem(client.playerStorage));

        // Check for a playerId cookie for this specific game board. Since cookies
        // are strings, this will return TRUE even if '0'.
        if (playerId !== null) {
          const newPlayer = playerUtilities.getPlayerById(playerId, players);
          this.setState({player: newPlayer});
          socket.emit('pick-player', parseInt(playerId));
        }
      }
      this.setState({player: data});
    });

    socket.on("update-chat", data => {
      const { chat } = this.state;
      chat.unshift(data);
      this.setState({chat: chat});
    });

    socket.on("set-status", data => {
      const { alerts } = this.state;
      alerts.unshift(data);
      this.setState({alerts: alerts});
    });

    socket.on("set-recaptcha-key", data => {
      this.setState({recaptchaKey: data});
    })
  }

  handlePlayerChange = (newPlayerId) => {
    const { player, players, client } = this.state;
    if (!player || (newPlayerId && player && player.hasOwnProperty('playerId') && player.playerId !== newPlayerId)) {
      const newPlayer = playerUtilities.getPlayerById(newPlayerId, players);
      this.setState({player: newPlayer});
      socket.emit('pick-player', newPlayerId);
      localStorage.setItem(client.playerStorage, newPlayerId);
    }
  };

  render() {
    const { board, players, characters, stages, player, client, chat, alerts, user, recaptchaKey} = this.state;
    console.log('chat is updated');
    console.log(chat);

    return (
      <div className="grid-container">
        <div className="grid-x grid-padding-x">
          <div className="cell medium-2">
            <UserToolbar user={user} recaptchaKey={recaptchaKey}/>
            <BoardToolbar/>
          </div>
          <div className="cell auto">
            <Board
              board={board}
              players={players}
              characters={characters}
              stages={stages}
              currentPlayer={player}
              client={client}
              chat={chat}
              alerts={alerts}

              handlePlayerChange={this.handlePlayerChange}
            />
          </div>
        </div>
      </div>
    )
  }

};

export default App;
