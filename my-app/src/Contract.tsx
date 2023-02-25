import React, { useEffect, useState } from 'react';
import { AccountAddress, CcdAmount, JsonRpcClient } from '@concordium/web-sdk';
import { Result, ResultAsync } from 'neverthrow';
import { err, ok} from 'neverthrow';
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { FullState, FreeState,  viewOwner, viewFree } from './state';

export interface Info {
    version: number;
    index: bigint;
    name: string;
    amount: CcdAmount;
    owner: AccountAddress;
    methods: string[];
}

interface Props {
    children: React.ReactNode;
    rpc: JsonRpcClient;
    setContract: React.Dispatch<Info | undefined>;
}

export function resultFromTruthy<T, E = string>(value: T | undefined, msg: E): Result<T, E> {
    if (value) {
        return ok(value);
    }
    return err(msg);
}

export async function refresh(rpc: JsonRpcClient, index: bigint) {
    console.debug(`Refreshing info for contract ${index.toString()}`);
    const info = await rpc.getInstanceInfo({ index, subindex: BigInt(0) });
    if (!info) {
        throw new Error(`contract ${index} not found`);
    }

    const { version, name, owner, amount, methods } = info;
    const prefix = 'init';
    if (!name.startsWith(prefix)) {
        throw new Error(`name "${name}" doesn't start with "init"`);
    }
    return { version, index, name: name.substring(prefix.length), amount, owner, methods };
}

const parseContractIndex = Result.fromThrowable(BigInt, () => 'invalid contract index');

export function ContractSelector(props: Props) {
    const { children, rpc, setContract } = props;
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [validationError, setValidationError] = useState<string>();

    useEffect(() => {
        setIsLoading(true);
        resultFromTruthy(input, undefined)
            .andThen(parseContractIndex)
            .asyncAndThen((index: any) => ResultAsync.fromPromise(refresh(rpc, index), (e: any) => (e as Error).message))
            .match<[Info?, string?]>(
                (c: any) => [c, undefined],
                (e: any) => [undefined, e]
            )
            .then(([c, e]: [(Info | undefined)?, (string | undefined)?]) => {
                setContract(c);
                setValidationError(e);
                setIsLoading(false);
            });
    }, [rpc, input, setContract]);

    return (
        <>
            <Row>
                <Col>
                    <Form.Group as={Row} className="mb-3" controlId="contract">
                        <Form.Label column sm={3}>
                            Contract index:
                        </Form.Label>
                        <Col sm={9}>
                            <Form.Control
                                type="text"
                                placeholder="Address (index)"
                                value={input}
                                onChange={(e: any) => setInput(e.currentTarget.value)}
                                isInvalid={Boolean(validationError)}
                                autoFocus
                            />
                            <Form.Control.Feedback type="invalid">{validationError}</Form.Control.Feedback>
                        </Col>
                    </Form.Group>
                </Col>
            </Row>
            <Row>
                <Col>
                    {isLoading && <Spinner animation="border" />}
                    {children}
                </Col>
            </Row>
        </>
    );
}

interface ModalProps {
    rpc: JsonRpcClient;
    contract: Info | undefined;
    setContract: React.Dispatch<Info | undefined>;
}

export function ContractFullViewer(Mprops: ModalProps) {
    const { rpc, contract, setContract } = Mprops;

    const [show, setShow] = useState(false);
    const [currentContract, setCurrentContract] = useState<Info>();
    const [currentState, setCurrentState] = useState<Result<FullState, string>>();
    useEffect(() => {
        resultFromTruthy(currentContract, 'no contract selected')
            .asyncAndThen((c: any) => ResultAsync.fromPromise(viewOwner(rpc, c), (e) => (e as Error).message))
            .then(setCurrentState);
    }, [rpc, currentContract]);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);
    const handleSelect = () => {
        setContract(currentContract);
        handleClose();
    };
    const canSelect = Boolean(currentState?.isOk());

    return (
        <>
            <Button variant="outline-dark" size="sm" onClick={handleShow}>
                {!contract && 'Select contract'}
                {contract && (
                    <span>
                        Using&nbsp;contract&nbsp;<code>{contract.index.toString()}</code>
                    </span>
                )}
            </Button>
            <Modal show={show} onHide={handleClose} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Select contract</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <ContractSelector rpc={rpc} setContract={setCurrentContract}>
                        {currentContract && (
                            <>
                                <Alert variant="secondary">
                                    <Row>
                                        <Col sm={2}>Name:</Col>
                                        <Col sm={10}>
                                            <code>{currentContract.name}</code>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col sm={2}>Index:</Col>
                                        <Col sm={10}>
                                            <code>{currentContract.index.toString()}</code>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col sm={2}>Owner:</Col>
                                        <Col sm={10}>
                                            <code>{currentContract.owner.address}</code>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col sm={2}>Methods:</Col>
                                        <Col sm={10}>{currentContract.methods.join(', ')}</Col>
                                    </Row>
                                    <Row>
                                        <Col sm={2}>Platform:</Col>
                                        <Col sm={10}>v{currentContract.version}</Col>
                                    </Row>
                                </Alert>
                                {!currentState && <Spinner animation="border" />}
                                {currentState?.match(
                                    ({ stateinfo, json_content }) => (
                                        <Alert variant="success">
                                            Currently stored weights info:
                                            <textarea>{stateinfo!.toString()}</textarea>
                                            Currently stored weights content:
                                            <textarea>{json_content!.toString()}</textarea>
                                        </Alert>
                                    ),
                                    (e: any) => (
                                        <Alert variant="danger">{e}</Alert>
                                    )
                                )}
                            </>
                        )}
                    </ContractSelector>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={handleSelect} disabled={!canSelect}>
                        Select
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export function ContractFreeViewer(Mprops: ModalProps) {
    const { rpc, contract, setContract } = Mprops;

    const [show, setShow] = useState(false);
    const [currentContract, setCurrentContract] = useState<Info>();
    const [currentState, setCurrentState] = useState<Result<FreeState, string>>();
    useEffect(() => {
        resultFromTruthy(currentContract, 'no contract selected')
            .asyncAndThen((c: any) => ResultAsync.fromPromise(viewFree(rpc, c), (e) => (e as Error).message))
            .then(setCurrentState);
    }, [rpc, currentContract]);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);
    const handleSelect = () => {
        setContract(currentContract);
        handleClose();
    };
    const canSelect = Boolean(currentState?.isOk());

    return (
        <>
            <Button variant="outline-dark" size="sm" onClick={handleShow}>
                {!contract && 'Select contract'}
                {contract && (
                    <span>
                        Using&nbsp;contract&nbsp;<code>{contract.index.toString()}</code>
                    </span>
                )}
            </Button>
            <Modal show={show} onHide={handleClose} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Select contract</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <ContractSelector rpc={rpc} setContract={setCurrentContract}>
                        {currentContract && (
                            <>
                                <Alert variant="secondary">
                                    <Row>
                                        <Col sm={2}>Name:</Col>
                                        <Col sm={10}>
                                            <code>{currentContract.name}</code>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col sm={2}>Index:</Col>
                                        <Col sm={10}>
                                            <code>{currentContract.index.toString()}</code>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col sm={2}>Owner:</Col>
                                        <Col sm={10}>
                                            <code>{currentContract.owner.address}</code>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col sm={2}>Methods:</Col>
                                        <Col sm={10}>{currentContract.methods.join(', ')}</Col>
                                    </Row>
                                    <Row>
                                        <Col sm={2}>Platform:</Col>
                                        <Col sm={10}>v{currentContract.version}</Col>
                                    </Row>
                                </Alert>
                                {!currentState && <Spinner animation="border" />}
                                {currentState?.match(
                                    ({ stateinfo }) => (
                                        <Alert variant="success">
                                            Currently stored weights info:
                                            <textarea>{stateinfo!.toString()}</textarea>
                                        </Alert>
                                    ),
                                    (e: any) => (
                                        <Alert variant="danger">{e}</Alert>
                                    )
                                )}
                            </>
                        )}
                    </ContractSelector>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={handleSelect} disabled={!canSelect}>
                        Select
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}