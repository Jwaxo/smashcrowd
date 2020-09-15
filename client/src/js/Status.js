import React, { Component } from 'react';

class Status extends Component {

  render() {
    const { type, message } = this.props;

    const statusClasses = [
      'status',
      'callout',
      type ? type : null,
    ].filter(classString => (classString != null)).join(' ');

    return (
      <div className={ statusClasses } data-closable>
        {message}
        <button className="close-button" aria-label="Dismiss alert"
                type="button" data-close>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    )
  }
}

export default Status;
