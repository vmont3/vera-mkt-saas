import algosdk from 'algosdk';

export class AlgorandService {
    private algodClient: algosdk.Algodv2;
    private account: algosdk.Account | null = null;

    constructor() {
        const token = process.env.ALGORAND_ALGOD_TOKEN || '';
        const server = process.env.ALGORAND_ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
        const port = process.env.ALGORAND_ALGOD_PORT || '';

        this.algodClient = new algosdk.Algodv2(token, server, port);

        const mnemonic = process.env.ALGORAND_WALLET_MNEMONIC;
        if (mnemonic) {
            try {
                this.account = algosdk.mnemonicToSecretKey(mnemonic);
            } catch (e) {
                console.error('Invalid Algorand Mnemonic:', e);
            }
        }
    }

    async anchor(data: any): Promise<{ txId: string; hash: string }> {
        if (!this.account) {
            throw new Error('Algorand wallet not configured (ALGORAND_WALLET_MNEMONIC missing)');
        }

        try {
            // 1. Get suggested params
            const suggestedParams = await this.algodClient.getTransactionParams().do();

            // 2. Create transaction (0 value payment to self, with note)
            const note = new Uint8Array(Buffer.from(JSON.stringify(data)));

            const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                sender: this.account.addr,
                receiver: this.account.addr,
                amount: 0,
                note: note,
                suggestedParams: suggestedParams,
            });

            // 3. Sign transaction
            const signedTxn = txn.signTxn(this.account.sk);

            // 4. Submit transaction
            const response = await this.algodClient.sendRawTransaction(signedTxn).do();
            const txId = response.txid;

            // 5. Wait for confirmation
            await algosdk.waitForConfirmation(this.algodClient, txId, 4);

            return {
                txId: txId,
                hash: txId,
            };

        } catch (error) {
            console.error('Algorand Anchoring Failed:', error);
            throw new Error('Blockchain anchoring failed');
        }
    }
}
