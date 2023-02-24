import { JsonRpcClient, toBuffer, CcdAmount, AccountTransactionType } from '@concordium/web-sdk';
import { Buffer } from 'buffer/';
import { Info } from './Contract';
import { contractUpdatePayload } from './useStorage';
import { WalletConnection } from '@concordium/react-components';


export interface FullState {
    contract: Info;
    stateinfo: StateInfo;
    json_content: JSON;
    ownerAddress: string;
    queryTime: Date;
}

export interface StateInfo {
    model: string,
    dataset: string,
    amount: CcdAmount,
    avg_acc: string,
    ver_cnt: number
}

export interface FreeState {
    contract: Info;
    stateinfo: StateInfo;
    ownerAddress: string;
    queryTime: Date;
}

export async function viewOwner(rpc: JsonRpcClient, contract: Info) {
    console.debug(`Viewing contract state for contract ${contract.index.toString()}`);
    const { version, name, index, methods } = contract;

    const expectedMethods = ['init', 'view_owner'].map((m) => `${name}.${m}`);
    if (!expectedMethods.every(methods.includes.bind(methods))) {
        throw new Error(
            `contract "${name}" lacks at least one of the expected methods (${expectedMethods.join(
                ', '
            )})`
        );
    }

    const method = `${name}.view_owner`;
    const result = await rpc.invokeContract({ contract: { index, subindex: BigInt(0) }, method });
    if (!result) {
        throw new Error(`invocation of method "${method}" on contract "${index}" returned no result`);
    }
    switch (result.tag) {
        case 'failure': {
            throw new Error(
                `invocation of method "${method}" on v${version} contract "${index}" failed: ${JSON.stringify(
                    result.reason
                )}`
            );
        }
        case 'success': {
            const buffer = toBuffer(result.returnValue || '', 'hex');
            return decodeFullState(buffer, contract, new Date());
        }
        default: {
            throw new Error('unexpected result tag');
        }
    }
}

export async function viewFree(rpc: JsonRpcClient, contract: Info) {
    console.debug(`Refreshing contract state for contract ${contract.index.toString()}`);
    const { version, name, index, methods } = contract;

    const expectedMethods = ['init', 'view_free'].map((m) => `${name}.${m}`);
    if (!expectedMethods.every(methods.includes.bind(methods))) {
        throw new Error(
            `contract "${name}" lacks at least one of the expected methods (${expectedMethods.join(
                ', '
            )})`
        );
    }

    const method = `${name}.view_free`;
    const result = await rpc.invokeContract({ contract: { index, subindex: BigInt(0) }, method });
    if (!result) {
        throw new Error(`invocation of method "${method}" on contract "${index}" returned no result`);
    }
    switch (result.tag) {
        case 'failure': {
            throw new Error(
                `invocation of method "${method}" on v${version} contract "${index}" failed: ${JSON.stringify(
                    result.reason
                )}`
            );
        }
        case 'success': {
            const buffer = toBuffer(result.returnValue || '', 'hex');
            return decodeFreeState(buffer, contract, new Date());
        }
        default: {
            throw new Error('unexpected result tag');
        }
    }
}

export async function submitPayView(connection: typeof WalletConnection, amount: CcdAmount, account: string, contract: Info) {
    return connection.signAndSendTransaction(
        account,
        AccountTransactionType.Transfer,
        contractUpdatePayload(amount, contract, 'view_payer'),
    );
}

export async function viewPayer(connection: typeof WalletConnection, rpc: JsonRpcClient, contract: Info, amount: CcdAmount, account: string) {
    console.debug(`Refreshing contract state for contract ${contract.index.toString()}`);
    const { version, name, index, methods } = contract;

    const expectedMethods = ['init', 'view_payer'].map((m) => `${name}.${m}`);
    if (!expectedMethods.every(methods.includes.bind(methods))) {
        throw new Error(
            `contract "${name}" lacks at least one of the expected methods (${expectedMethods.join(
                ', '
            )})`
        );
    }

    await submitPayView(connection, amount, account, contract);
    const method = `${name}.view_payer`;
    const result = await rpc.invokeContract({ contract: { index, subindex: BigInt(0) }, method });
    if (!result) {
        throw new Error(`invocation of method "${method}" on contract "${index}" returned no result`);
    }
    switch (result.tag) {
        case 'failure': {
            throw new Error(
                `invocation of method "${method}" on v${version} contract "${index}" failed: ${JSON.stringify(
                    result.reason
                )}`
            );
        }
        case 'success': {
            const buffer = toBuffer(result.returnValue || '', 'hex');
            return decodeFullState(buffer, contract, new Date());
        }
        default: {
            throw new Error('unexpected result tag');
        }
    }
}

function decodeFullState(buffer: Buffer, contract: Info, queryTime: Date): FullState {
    const [model, offset1] = decodeString(buffer, 0);
    const [dataset, offset2] = decodeString(buffer, offset1);
    const [amount, offset3] = decodeByte(buffer, offset2);
    const [avg_acc, offset4] = decodeString(buffer, offset3);
    const [ver_cnt, offset5] = decodeByte(buffer, offset4);
    const [json_content, offset6] = decodeJson(buffer, offset5);

    const stateinfo: StateInfo = {model,
                                dataset,
                                amount,
                                avg_acc,
                                ver_cnt};
    
    return {
        contract,
        stateinfo: stateinfo,
        json_content: json_content,
        ownerAddress: contract.owner.address,
        queryTime,
    };
}

function decodeFreeState(buffer: Buffer, contract: Info, queryTime: Date): FreeState {
    const [model, offset1] = decodeString(buffer, 0);
    const [dataset, offset2] = decodeString(buffer, offset1);
    const [amount, offset3] = decodeByte(buffer, offset2);
    const [avg_acc, offset4] = decodeString(buffer, offset3);
    const [ver_cnt, offset5] = decodeByte(buffer, offset4);

    const stateinfo: StateInfo = {model,
                                dataset,
                                amount,
                                avg_acc,
                                ver_cnt};
    
    return {
        contract,
        stateinfo: stateinfo,
        ownerAddress: contract.owner.address,
        queryTime,
    };
}

function decodeByte(buffer: Buffer, offset: any) {
    return [buffer.readUInt8(offset), offset + 1];
}

function decodeString(buffer: Buffer, offset: any) {
    return [buffer.toString(), offset + 3];
}

function decodeJson(buffer: Buffer, offset: any) {
    return [buffer.toJSON(), offset + 3];
}