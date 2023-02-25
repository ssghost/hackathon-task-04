import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, Container, Row, Spinner } from 'react-bootstrap';
import { HttpProvider, JsonRpcClient } from '@concordium/web-sdk';
import { Result, ResultAsync } from 'neverthrow';
import {
    BrowserWalletConnector,
    useConnect,
    useConnection,
    WalletConnectionProps,
} from '@concordium/react-components';
import { ContractFullViewer, ContractFreeViewer, Info, refresh } from './Contract';
import { BROWSER_WALLET, DEFAULT_CONTRACT_INDEX, TESTNET } from './config';
import { JsonStorage, PayStorage } from './inputStorage';
import { resultFromTruthy } from './Contract';
import { useUpdate, usePayview } from './useStorage';
import { FullState, FreeState, viewOwner, viewFree } from './state';


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
    }, [activeConnector, setConnection]);

    const [contract, setContract] = useState<Info>();

    switch (Boolean(account) && account === contract?.owner.address) {
        case true :  return (<OwnerApp></OwnerApp>);
        case false : return (<PayerApp></PayerApp>);
        default : return (<PayerApp></PayerApp>); 
    };

    function OwnerApp() {
        const [fullstate, setFullState] = useState<Result<FullState, string>>();
        useEffect(() => {
            resultFromTruthy(contract, 'no contract selected')
                .asyncAndThen((c: any) => ResultAsync.fromPromise(viewOwner(rpc, c), (e: any) => (e as Error).message))
                .then(setFullState);
        }, [contract]);

        useEffect(() => refreshContract(DEFAULT_CONTRACT_INDEX, setContract), []);

        const { canRecv, receive } = useUpdate(connection, account, contract);
        return (
            <Container>
                <Row>
                    <Col className="d-flex">
                        <h1>Weights Storage dApp</h1>
                        <div className="ms-auto p-2">
                            <ContractFullViewer rpc={rpc} contract={contract} setContract={setContract} />
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
                        {!fullstate && <Spinner animation="border" />}
                        {fullstate?.match(
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
                                    <p>Only owner can store a pretrained model wheights json file into the contract.</p>
                                    <JsonStorage
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

    function PayerApp() {
        const [freestate, setFreeState] = useState<Result<FreeState, string>>();
        useEffect(() => {
            resultFromTruthy(contract, 'no contract selected')
                .asyncAndThen((c: any) => ResultAsync.fromPromise(viewFree(rpc, c), (e: any) => (e as Error).message))
                .then(setFreeState);
        }, [contract]);

        useEffect(() => refreshContract(DEFAULT_CONTRACT_INDEX, setContract), []);

        const { canPayview, payview } = usePayview(connection, account, contract);
        return (
            <Container>
                <Row>
                    <Col className="d-flex">
                        <h1>Weights Storage dApp</h1>
                        <div className="ms-auto p-2">
                            <ContractFreeViewer rpc={rpc} contract={contract} setContract={setContract} />
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
                        {!freestate && <Spinner animation="border" />}
                        {freestate?.match(
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
                                            . As of {state.queryTime.toLocaleTimeString()} it stores a pretrained model weights with information of {' '}
                                            <em>{JSON.stringify(state.stateinfo)}</em> {' '} .
                                        </div>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="p-2"
                                            onClick={() => refreshContract(state.contract.index, setContract)}
                                        >Refresh
                                        </Button>
                                    </Alert>
                                    <h6>Pay to view the whole Json weights file:</h6>
                                    <p>Users can view the whole json file in the contract by transfer an amount of {state.stateinfo.amount} to the contract address.</p>
                                    <PayStorage 
                                        amount={state.stateinfo.amount} 
                                        rpc={rpc}
                                        canPayview = {canPayview}
                                        payview = {payview}
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
}
