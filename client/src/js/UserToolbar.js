import React, { Component } from 'react';

import Modal from './Modal';
import FormUserLogin from './FormUserLogin.js';
import FormUserRegister from './FormUserRegister.js';

class UserToolbar extends Component {

  constructor(props) {
    super(props);

    this.state = {
      showLoginModal: false,
      showRegisterModal: false,
    };
  }

  toggleLoginModal = () => this.setState({ showLoginModal: !this.state.showLoginModal });
  toggleRegisterModal = () => this.setState({ showRegisterModal: !this.state.showRegisterModal });

  render() {
    const { user, recaptchaKey } = this.props;
    const { id: userId, username, label } = user;
    const { showLoginModal, showRegisterModal } = this.state;
    return (
      <div className="user-toolbar">
        { userId ? (
          [
            `${label} (${username})`,
            (
              <button className="logout button">Logout</button>
            ),
          ]
        ) : (
          [
            (
              <button
                key="login"
                className="login button"
                onClick={this.toggleLoginModal}>
                Login
              </button>
            ),
            (
              <button
                key="register"
                className="register button"
                onClick={this.toggleRegisterModal}>
                Register
              </button>
            ),
          ]
        )}
        {
          showLoginModal ? (
            <Modal closeFunction={this.toggleLoginModal}>
              <FormUserLogin />
            </Modal>
          ) : null
        }
        {
          showRegisterModal ? (
            <Modal closeFunction={this.toggleRegisterModal}>
              <FormUserRegister recaptchaKey={recaptchaKey} />
            </Modal>
          ) : null
        }
      </div>
    )
  }
}

export default UserToolbar;
