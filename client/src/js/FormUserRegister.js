import React, { Component } from 'react';

class FormUserRegister extends Component {
  render() {
    const { recaptchaKey } = this.props;

    return (

      <form name="new-user">

        <div className="grid-x grid-padding-x">
          <div className="medium-12 cell">
            <h3>New User Registration</h3>
            <div className="error-container help-text"></div>
          </div>
        </div>

        <div className="grid-x grid-padding-x">
          <div className="medium-6 cell">
            <label>Username
              <input type="text" name="username" placeholder="ExaMple" required
                     maxLength="16" />
            </label>
          </div>
          <div className="medium-6 cell">
            <label>Email
              <input type="email" name="email"
                     placeholder="exam.ple@example.com" required maxLength="32" />
            </label>
          </div>
        </div>
        <div className="grid-x grid-padding-x password-container">
          <div className="medium-6 cell">
            <label>Password
              <input type="password" name="password1" required />
            </label>
          </div>
          <div className="medium-6 cell">
            <label>Repeat Password
              <input type="password" name="password2" required />
            </label>
          </div>
          <div className="medium-12 cell">
            <p className="help-text">Your password must be at least 12
              characters long.</p>
          </div>
        </div>

        <div className="grid-x grid-padding-x">
          <div className="medium-12 cell">
            { recaptchaKey ? (
            <div className="g-recaptcha"
                 data-sitekey={recaptchaKey}></div>
              ) : null }
          </div>
          <div className="medium-12 cell">
            <button className="button" type="submit">Submit</button>
          </div>
        </div>

      </form>
    )
  }
}

export default FormUserRegister;
