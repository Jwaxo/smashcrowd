import React, { Component } from 'react';

class Alert extends Component {
  timeoutTypes = [
    null,
    'secondary',
  ];
  closeSpeed = 500;

  constructor(props) {
    super(props);

    this.state = {
      open: true,
      opacity: 1,
    };
  }

  componentDidMount() {
    if (this.timeoutTypes.includes(this.props.type)) {
      setTimeout(() => this.close(), 5000);
    }
  }

  close = () => {
    // Get opacity from the state just in case the alert has already started closing.
    const { onClose, index } = this.props;
    let { opacity } = this.state;
    const interval = setInterval(() => {
      if (opacity <= 0) {
        this.setState({open: false});
        clearInterval(interval);
      }
      else {
        opacity = opacity - .01;
        this.setState({opacity})
      }
    }, this.closeSpeed / 100);

    onClose(index);
  };

  render() {
    const { type, message } = this.props;
    const { open, opacity } = this.state;

    const alertClasses = [
      'callout',
      type ? type : null,
      !open ? 'hidden' : null,
    ].filter(classString => (classString != null)).join(' ');

    return (
      <div className={ alertClasses } style={ {opacity} } data-closable>
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
