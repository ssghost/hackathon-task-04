import { CcdAmount } from '@concordium/web-sdk';
import { err, ok } from 'neverthrow';
import { useCallback, useEffect, useState } from 'react';
import { Button, Col, Form, InputGroup, Row } from 'react-bootstrap';
import { resultFromTruthy } from './Contract';
import { readFileSync } from 'fs';
import { usePayview } from './useStorage';

export type RecvSchema = {
    amount: CcdAmount,
    avg_acc: string,
    json_content: string
}

interface Props {
    canRecv: boolean;
    receive: ({amount, avg_acc, json_content}: RecvSchema) => void;
}

interface PayProps {
    canPayview: boolean;
    payview: (amount: CcdAmount) => void;
}

export function JsonStorage(props: Props) {
    const { canRecv, receive } = props;
    const [amount, setAmount] = useState<CcdAmount>();
    const [acc, setAcc] = useState<number>();
    const [content, setContent] = useState<JSON>();
    const [validationError, setValidationError] = useState<string>();

    useEffect(() => {
        const [_amount, error]: [(CcdAmount | undefined)?, (string | undefined)?] = resultFromTruthy(amount, undefined)
            .andThen((input: any) => {
                const _input = BigInt(input);
                return _input ? err('invalid input') : ok(_input);
            })
            .match<[CcdAmount?, string?]>(
                (a: any) => [a, undefined],
                (e: any) => [undefined, e]
            );
        setAmount(amount);
        setValidationError(error);
    }, [amount]);

    useEffect(() => {
        const [_acc, error]: [(number | undefined)?, (string | undefined)?] = resultFromTruthy(acc, undefined)
            .andThen((input: any) => {
                const _input = Number(input);
                return _input ? err('invalid input') : ok(_input);
            })
            .match<[number?, string?]>(
                (a: any) => [a, undefined],
                (e: any) => [undefined, e]
            );
        setAcc(acc);
        setValidationError(error);
    }, [acc]); 

    useEffect(() => {
        const [_content, error]: [(JSON | undefined)?, (string | undefined)?] = resultFromTruthy(content, undefined)
            .andThen((input: any) => {
                const _input = readFileSync(input).toJSON();
                return _input ? err('invalid input') : ok(_input);
            })
            .match<[JSON?, string?]>(
                (a: any) => [a, undefined],
                (e: any) => [undefined, e]
            );
        setContent(content);
        setValidationError(error);
    }, [content]); 

    const handleSubmitStorage = useCallback(() => {
        console.log(`Attempting to update storage.`);
        if (content!) {
            let schema: RecvSchema = {amount: amount!, avg_acc: Number(acc).toString(), json_content: JSON.stringify(content)};
            receive(schema);
        }
    }, [acc, amount, content, receive]);

    return (
        <Row>
            <Form.Group as={Col} md={8}>
                <InputGroup className="mb-3" hasValidation>
                    <InputGroup.Text id="basic-addon1">Weights Storage</InputGroup.Text>
                    <Form.Control
                        type="text"
                        placeholder="Payment Amount"
                        onChange={(e: any) => setAmount(e.target.value)}
                        isInvalid={Boolean(validationError)}
                    />
                    <Form.Control
                        type="text"
                        placeholder="Model Accuracy"
                        onChange={(e: any) => setAcc(e.target.value)}
                        isInvalid={Boolean(validationError)}
                    /> 
                    <Form.Group controlId="formFile" className="mb-3">
                        <Form.Label>Input Json File Of Weights</Form.Label>
                        <Form.Control 
                            type="file"
                            onChange = {(e: any) => setContent(e.target.files[0])}
                            isInvalid={Boolean(validationError)}
                        />
                    </Form.Group>
                    <Button variant="primary" onClick={handleSubmitStorage} disabled={!canRecv}>
                        Update New Weights
                    </Button>
                    <Form.Control.Feedback type="invalid">{validationError}</Form.Control.Feedback>
                </InputGroup>
            </Form.Group>
        </Row>
    );
}

export function PayStorage(payprops: PayProps, amount: CcdAmount) {
    const { canPayview, payview } = payprops;

    const handlePaymentStorage = useCallback(() => {
        console.log(`Attempting to update storage.`);
        if (amount!) {
            payview(amount);
        }
    }, [amount, payview]);

    const [validationError, setValidationError] = useState<string>();

    return (
        <Row>
            <Form.Group as={Col} md={8}>
                <InputGroup className="mb-3" hasValidation>
                    <InputGroup.Text id="basic-addon1">Payment Confirmation</InputGroup.Text>
                    <Button variant="primary" onClick={handlePaymentStorage} disabled={!canPayview}>
                        Pay to View
                    </Button>
                    <Form.Control.Feedback type="invalid">{validationError}</Form.Control.Feedback>
                </InputGroup>
            </Form.Group>
        </Row>
    );
}