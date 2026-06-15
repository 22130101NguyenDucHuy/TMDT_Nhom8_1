import React from "react";
import ReactDOM from "react-dom/client";

function DebugApp() {
  return React.createElement('div', null, 
    React.createElement('h1', null, 'DEBUG: React is working'),
    React.createElement('p', null, 'If you see this, React rendering works.')
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(React.StrictMode, null,
    React.createElement(DebugApp)
  )
);
