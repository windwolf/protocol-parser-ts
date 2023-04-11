import { BinaryProtocolParser, BinaryProtocolSchema, BinaryProtocolFrame } from "./binary-protocol.parser";



export class Uint8ArrayToDataFrameTransformer implements Transformer<Uint8Array, BinaryProtocolFrame> {

    private _protocolParser: BinaryProtocolParser;
    public constructor(private schema: BinaryProtocolSchema) {
        this._protocolParser = new BinaryProtocolParser(schema);
    }


    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public start(controller: TransformStreamDefaultController) {
        //console.info('_start');
    }

    public transform(chunk: Uint8Array, controller: TransformStreamDefaultController) {

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

export class DataFrameToUint8ArrayTransformer implements Transformer<BinaryProtocolFrame, Uint8Array> {

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public start(controller: TransformStreamDefaultController) {
        //console.info('_start');
    }

    public transform(chunk: BinaryProtocolFrame, controller: TransformStreamDefaultController) {
        controller.enqueue(chunk.buffer);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public flush(controller: TransformStreamDefaultController) {
        //console.info('_flush');
    }
}
