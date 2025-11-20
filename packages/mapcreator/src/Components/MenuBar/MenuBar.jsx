import { useState } from 'react';
import './MenuBar.css';

export function MenuBar({ children, onClickOpen, onClickSave, onClickNew }) {
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);

  const handleOpen = () => {
    setIsFileMenuOpen(false);
    onClickOpen();
  };

  const handleSave = () => {
    setIsFileMenuOpen(false);
    onClickSave();
  };

  const handleNew = () => {
    setIsFileMenuOpen(false);
    onClickNew();
  };

  const handleFileClick = () => {
    setIsFileMenuOpen(!isFileMenuOpen);
  };

  return (
    <div className="menu-bar">
      <div className="menu-item" onClick={handleFileClick} onMouseLeave={() => setIsFileMenuOpen(false)}>
        <button
          className="menu-button"
          onClick={handleFileClick}
        >
          File
        </button>
        {isFileMenuOpen && (
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={handleSave}>
              Save
            </button>
            <button className="dropdown-item" onClick={handleOpen}>
              Open
            </button>
            <button className="dropdown-item" onClick={handleNew}>
              New
            </button>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
