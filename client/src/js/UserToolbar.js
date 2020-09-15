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
            username,
            (
              <button className="logout button">Logout</button>
            ),
          ]
        ) : (
          [
            (
              <button className="login button"
                onClick={this.toggleLoginModal}>
                Login
              </button>
            ),
            (
              <button
                className="register button"
                onClick={this.toggleRegisterModal}>
                Register
              </button>
            ),
          ]
        )}
        {
          showLoginModal ? (
            <Modal>
              <FormUserLogin />
              <button onClick={this.toggleLoginModal}
                      className="close-button"
                      aria-label="Close modal" type="button">
                <span aria-hidden="true">&times;</span>
              </button>
            </Modal>
          ) : null
        }
        {
          showRegisterModal ? (
            <Modal>
              <FormUserRegister recaptchaKey={recaptchaKey} />
              <button onClick={this.toggleRegisterModal}
                      className="close-button"
                      aria-label="Close modal" type="button">
                <span aria-hidden="true">&times;</span>
              </button>
            </Modal>
          ) : null
        }
      </div>
    )
  }
}

export default UserToolbar;
