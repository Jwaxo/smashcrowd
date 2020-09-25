import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const Modal = ({ closeFunction, children }) => {
  const elRef = useRef(null);
  if (!elRef.current) {
    elRef.current = document.createElement("div");
  }

  useEffect(() => {
    const modalRoot = document.getElementById("modal");
    modalRoot.setAttribute('class', 'modal reveal-overlay');
    modalRoot.setAttribute('style', 'display: block');
    modalRoot.appendChild(elRef.current);

    return () => {
      modalRoot.removeChild(elRef.current);
      modalRoot.setAttribute('class', '');
      modalRoot.setAttribute('style', '');
    }
  }, []);

  return createPortal((
    <div className="reveal" style={{display: 'block'}}>
      {children}
      <button onClick={closeFunction}
              className="close-button"
              aria-label="Close modal" type="button">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  ), elRef.current);
};

export default Modal;
