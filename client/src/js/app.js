import React, { useState, useEffect } from 'react';
import socketIOClient from "socket.io-client";

import UserToolbar from './UserToolbar';
import BoardToolbar from './BoardToolbar';
import Board from './Board';

const App = () => {
  const [board, setBoard] = useState({});
  const [players, setPlayers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [stages, setStages] = useState([]);
  const [client, setClient] = useState({});
  const [user, setUser] = useState({});
  const [player, setPlayer] = useState({});
  const [chat, setChat] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [recaptchaKey, setRecaptchaKey] = useState('recaptcha_key');

  useEffect(() => {
    const socket = socketIOClient();

    socket.on("rebuild-boardInfo", data => {
      setBoard(data);
    });

    socket.on("rebuild-players", data => {
      setPlayers(data);
    });

    socket.on("rebuild-characters", data => {
      setCharacters(data);
    });

    socket.on("rebuild-stages", data => {
      setStages(data);
    });

    socket.on("rebuild-chat", data => {
      setChat(data);
    });

    socket.on("set-client", data => {
      setClient(data);
    });

    socket.on("set-user", data => {
      setUser(data);
    });

    socket.on("set-player", data => {
      setPlayer(data);
    });

    socket.on("update-chat", data => {
      setChat(chat.unshift(data));
    });

    socket.on("set-status", data => {
      setAlerts(alerts.unshift(data));
    });

    socket.on("set-recaptcha-key", data => {
      setRecaptchaKey(data);
    })
  }, []);

  return (
    <div className="grid-container">
      <div className="grid-x grid-padding-x">
        <div className="cell medium-2">
          <UserToolbar user={user} recaptchaKey={recaptchaKey} />
          <BoardToolbar />
        </div>
        <div className="cell auto">
          <Board
            board={board}
            players={players}
            characters={characters}
            stages={stages}
            player={player}
            client={client}
            chat={chat}
            alerts={alerts}/>
        </div>
      </div>
    </div>
  )

};

export default App;
