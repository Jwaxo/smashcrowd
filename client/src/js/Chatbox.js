import React, { Component } from 'react';

class Chatbox extends Component {

  render() {
    const { chat } = this.props;

    return (
      <div className="chat-box">
        { chat.length > 0 ? chat.map((message) => {
          return (
            <div className="chat-item">{message}</div>
          )
        }) : ''}
      </div>
    )
  }
}

export default Chatbox;
