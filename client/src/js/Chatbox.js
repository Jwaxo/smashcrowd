import React, { Component } from 'react';

class Chatbox extends Component {

  render() {
    const { chat } = this.props;

    return (
      <div className="chat-box">
        { chat.length > 0 ? chat.map((message, index) => {
          return (
            <div className="chat-item" key={index}>{message}</div>
          )
        }) : ''}
      </div>
    )
  }
}

export default Chatbox;
