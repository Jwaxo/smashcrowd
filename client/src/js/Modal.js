import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const Modal = ({ children }) => {
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

  return createPortal(<div className="reveal" style={{display: 'block'}}>{children}</div>, elRef.current);
};

export default Modal;
