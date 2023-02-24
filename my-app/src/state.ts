import { JsonRpcClient, toBuffer } from '@concordium/web-sdk';
import { Buffer } from 'buffer/';
import { Info } from './Contract';

export interface StorageState {
    contract: Info;
    value: number;
    ownerAddress: string;
    queryTime: Date;
}

export async function refreshState(rpc: JsonRpcClient, contract: Info) {
    console.debug(`Refreshing contract state for contract ${contract.index.toString()}`);
    const { version, name, index, methods } = contract;

    const expectedMethods = ['init', 'receive', 'view'].map((m) => `${name}.${m}`);
    if (!expectedMethods.every(methods.includes.bind(methods))) {
        throw new Error(
            `contract "${name}" lacks at least one of the expected methods (${expectedMethods.join(
                ', '
            )})`
        );
    }

    const method = `${name}.view`;
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
            return decodeState(buffer, contract, new Date());
        }
        default: {
            throw new Error('unexpected result tag');
        }
    }
}

function decodeState(buffer: Buffer, contract: Info, queryTime: Date): StorageState {
    const [state] = decodeByte(buffer, 0);
    return {
        contract,
        value: state.valueOf(),
        ownerAddress: contract.owner.address,
        queryTime,
    };
}

function decodeByte(buffer: Buffer, offset: number) {
    return [buffer.readUInt8(offset), offset + 1];
}