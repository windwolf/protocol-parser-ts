import { ASCIIProtocolParser } from './ascii-protocol.parser';


export class ASCIIProtocolTransformer implements Transformer<string, Map<string, string>> {

    private _protocolParser = new ASCIIProtocolParser();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public start(controller: TransformStreamDefaultController) {
        //console.info('_start');
    }

    public transform(chunk: string, controller: TransformStreamDefaultController) {

        this._protocolParser.feed(chunk);
        do {
            const data = this._protocolParser.parse();
            if (data == null) {
                break;
            }
            controller.enqueue(data);

            // eslint-disable-next-line no-constant-condition
        } while (true);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public flush(controller: TransformStreamDefaultController) {
        //console.info('_flush');
    }


}
