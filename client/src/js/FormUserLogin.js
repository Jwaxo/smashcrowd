import React, { Component } from 'react';

class FormUserLogin extends Component {
  render() {
    return (

      <form name="user-login">

        <div className="grid-x grid-padding-x">
          <div className="medium-12 cell">
            <h3>User Login</h3>
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
            <div className="medium-6 cell">
              <label>Password
                <input type="password" name="password" required />
              </label>
            </div>
          </div>
        </div>
        <div
          className="grid-x grid-padding-x forgot-password-container is-hidden">

          <div className="medium-6 cell">
            <label>Enter your email
              <input type="email" name="email"
                     placeholder="exam.ple@example.com" maxLength="32" />
            </label>
          </div>
        </div>

        <div className="grid-x grid-padding-x">
          <div className="medium-12 cell">
            <button className="button" type="submit">Submit</button>
          </div>
        </div>

      </form>
    )
  }
}

export default FormUserLogin;
