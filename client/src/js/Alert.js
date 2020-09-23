import React, { Component } from 'react';

class Alert extends Component {

  constructor(props) {
    super(props);

    this.state = {
      open: true
    };
  }

  close = () => {
    this.setState({open: false});
  };

  render() {
    const { type, message } = this.props;
    const { open } = this.state;

    const alertClasses = [
      'alert',
      'callout',
      type ? type : null,
      !open ? 'hidden' : null,
    ].filter(classString => (classString != null)).join(' ');

    return (
      <div className={ alertClasses } data-closable>
        {message}
        <button className="close-button" aria-label="Dismiss alert"
                type="button" onClick={this.close}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    )
  }
}

export default Alert;
