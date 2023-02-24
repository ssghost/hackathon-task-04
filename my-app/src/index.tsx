import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TESTNET } from './config';
import { WithWalletConnector } from '@concordium/react-components';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <WithWalletConnector network={TESTNET}>{(props: any) => <App {...props} />}</WithWalletConnector>
  </React.StrictMode>
);


