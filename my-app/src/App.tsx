import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, Container, Row, Spinner } from 'react-bootstrap';
import { HttpProvider, JsonRpcClient } from '@concordium/web-sdk';
import { Result, ResultAsync } from 'neverthrow';
import {
    BrowserWalletConnector,
    useConnect,
    useConnection,
    WalletConnectConnector,
    WalletConnectionProps,
} from '@concordium/react-components';
import { ContractManager, Info, refresh } from './Contract';
import { BROWSER_WALLET, DEFAULT_CONTRACT_INDEX, TESTNET, WALLET_CONNECT } from './config';
import MyStorage from './inputStorage';
import { resultFromTruthy } from './Contract';
import { useStorage } from './useStorage';
import { refreshState, StorageState } from './state';


interface Props {
    account: string | undefined;
}

export function BrowserWallet({ account }: Props) {
    if (!account) {
        return null;
    }
    return (
        <Alert variant="success">
            <p>
                Connected to account <code>{account}</code>.
            </p>
            <p>
                The wallet currently only exposes the &quot;most recently selected&quot; connected account, even if more
                than one is actually connected. Select and disconnect accounts through the wallet.
            </p>
        </Alert>
    );
}

const rpc = new JsonRpcClient(new HttpProvider(TESTNET.jsonRpcUrl));

function refreshContract(index: bigint, setContract: React.Dispatch<Info | undefined>) {
    refresh(rpc, index).then(setContract).catch(console.error);
}

export default function App(props: typeof WalletConnectionProps) {
    const {
        activeConnectorType,
        setActiveConnectorType,
        activeConnector,
        activeConnectorError,
        connectedAccounts,
        genesisHashes,
    } = props;
    const { connection, setConnection, account } = useConnection(connectedAccounts, genesisHashes);
    const { connect, isConnecting, connectError } = useConnect(activeConnector, setConnection);

    useEffect(() => {
        if (activeConnector) {
            const cs = activeConnector.getConnections();
            if (cs.length) {
                setConnection(cs[0]);
            }
        }
        return () => setConnection(undefined);
    }, [activeConnector]);

    const [contract, setContract] = useState<Info>();

    const [storageState, setStorageState] = useState<Result<StorageState, string>>();
    useEffect(() => {
        resultFromTruthy(contract, 'no contract selected')
            .asyncAndThen((c: any) => ResultAsync.fromPromise(refreshState(rpc, c), (e: any) => (e as Error).message))
            .then(setStorageState);
    }, [contract]);

    useEffect(() => refreshContract(DEFAULT_CONTRACT_INDEX, setContract), []);

    const { canRecv, receive } = useStorage(connection, account, contract);
    return (
        <Container>
            <Row>
                <Col className="d-flex">
                    <h1>Piggybank dApp</h1>
                    <div className="ms-auto p-2">
                        <ContractManager rpc={rpc} contract={contract} setContract={setContract} />
                    </div>
                </Col>
            </Row>
            <hr />
            <Row className="mb-3">
                <Col>
                    <Button
                        className="w-100"
                        variant={activeConnectorType === BROWSER_WALLET ? 'dark' : 'light'}
                        onClick={() =>
                            setActiveConnectorType(activeConnectorType === BROWSER_WALLET ? undefined : BROWSER_WALLET)
                        }
                    >
                        Use Browser Wallet
                    </Button>
                </Col>
            </Row>
            <Row>
                <Col>
                    {activeConnectorError && <Alert variant="danger">Connector error: {activeConnectorError}</Alert>}
                    {!activeConnectorError && activeConnectorType && !activeConnector && <Spinner animation="border" />}
                    {connectError && <Alert variant="danger">Connect error: {connectError}</Alert>}
                    {activeConnector && !account && (
                        <Button type="button" onClick={connect} disabled={isConnecting}>
                            {isConnecting && 'Connecting...'}
                            {!isConnecting && activeConnectorType === BROWSER_WALLET && 'Connect Browser Wallet'}
                        </Button>
                    )}
                    {activeConnector instanceof BrowserWalletConnector && <BrowserWallet account={account} />}
                </Col>
            </Row>
            <hr />
            <Row>
                <Col>
                    {!storageState && <Spinner animation="border" />}
                    {storageState?.match(
                        (state: any) => (
                            <>
                                <h2>
                                    Storage instance <code>{state.contract.index.toString()}</code>
                                </h2>
                                <Alert variant="light" className="d-flex">
                                    <div className="me-auto p-2">
                                        Owned by{' '}
                                        <code>
                                            {state.ownerAddress.slice(0, 4)}...{state.ownerAddress.slice(-4)}
                                        </code>
                                        . As of {state.queryTime.toLocaleTimeString()} it stores a value of {' '}
                                        <em>{Number(state.value)}</em> {' '} .
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="p-2"
                                        onClick={() => refreshContract(state.contract.index, setContract)}
                                    >Refresh
                                    </Button>
                                </Alert>
                                <h6>Update</h6>
                                <p>Everyone can store an integer number into the contract.</p>
                                <Storage
                                    canRecv = {canRecv}
                                    receive = {receive}
                                />
                            </>
                        ),
                        (e: any) => (
                            <Alert variant="danger">{e}</Alert>
                        )
                    )}
                </Col>
            </Row>
        </Container>
    );
}
