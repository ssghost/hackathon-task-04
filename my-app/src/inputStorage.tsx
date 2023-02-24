import { CcdAmount } from '@concordium/web-sdk';
import { err, ok } from 'neverthrow';
import { useCallback, useEffect, useState } from 'react';
import { Button, Col, Form, InputGroup, Row } from 'react-bootstrap';
import { resultFromTruthy } from './Contract';

export type RecvSchema = {
    amount: CcdAmount,
    avg_acc: number,
    json_content: JSON
}

interface Props {
    canRecv: boolean;
    receive: ({amount, avg_acc, json_content}: RecvSchema) => void;
}

export default function JsonStorage(props: Props) {
    const { canRecv, receive } = props;
    const [amount, setAmount] = useState<BigInt>(BigInt(0));
    const [acc, setAcc] = useState<number>();
    const [content, setContent] = useState<JSON>();
    const [validationError, setValidationError] = useState<string>();

    useEffect(() => {
        const [_amount, error]: [(bigint | undefined)?, (string | undefined)?] = resultFromTruthy(amount, undefined)
            .andThen((input: any) => {
                const ivalue = Number(input);
                return Number.isNaN(ivalue) ? err('invalid input') : ok(ivalue);
            })
            .match<[bigint?, string?]>(
                (a: any) => [Number(a), undefined],
                (e: any) => [undefined, e]
            );
        setRecvValue(ivalue);
        setShould(should);
        setValidationError(error);
    }, [inputValue]);

    const handleSubmitStorage = useCallback(() => {
        console.log(`Attempting to update storage.`);
        if (recvValue) {
            let schema: Schema = {should: should, value: recvValue};
            receive(schema);
            setShould(false);
            setInputValue('');
        }
    }, [recvValue, receive]);
    return (
        <Row>
            <Form.Group as={Col} md={8}>
                <InputGroup className="mb-3" hasValidation>
                    <InputGroup.Text id="basic-addon1">Storage</InputGroup.Text>
                    <Form.Control
                        type="text"
                        placeholder="Value to Store:"
                        value={inputValue}
                        onChange={(e: any) => setInputValue(e.target.value)}
                        isInvalid={Boolean(validationError)}
                    />
                    <Form.Check type="checkbox" id="should-checkbox">
                        <Form.Check.Input isValid value={should} onChange={() => setShould(!should)}></Form.Check.Input>
                        <Form.Check.Label>You decide whether the value should be stored.</Form.Check.Label>    
                    </Form.Check> 
                    <Button variant="primary" onClick={handleSubmitStorage} disabled={!canRecv || !recvValue}>
                        Update New Value
                    </Button>
                    <Form.Control.Feedback type="invalid">{validationError}</Form.Control.Feedback>
                </InputGroup>
            </Form.Group>
        </Row>
    );
}