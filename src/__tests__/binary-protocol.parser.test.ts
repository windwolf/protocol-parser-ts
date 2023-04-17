import { BinaryProtocolFrame, BinaryProtocolParser } from "../binary-protocol.parser";


test('binary-protocol.parser test1', () => {
    const schema1 = {
        prefix: new Uint8Array([0xFF, 0xFE]),
        commandSize: <const>1,
        defaultLength: {
            mode: <const>'fixed',
            length: 4,
        },
        alterDataSize: <const>1,
        crcSize: <const>1,
        suffix: new Uint8Array([0xCC]),
    };
    const parser = new BinaryProtocolParser(schema1);
    parser.feed(new Uint8Array([
        0xFF, 0xFE,
        0xFF, 0xFE, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x99, 0xCC,
        0x00, 0x00,
        0xFF, 0xFE, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x99, 0xCC]));
    let frame = parser.parse();
    expect(frame).not.toBeNull();
    frame = parser.parse();
    expect(frame).not.toBeNull();
});

test('binary-protocol.parser test2', () => {
    const schema2 = {
        prefix: new Uint8Array([0xFF, 0xFE]),
        commandSize: <const>1,
        defaultLength: {
            mode: <const>'dynamic',
            lengthSize: <const>1,
        },
        alterDataSize: <const>1,
        crcSize: <const>1,
        suffix: new Uint8Array([0xCC]),
    };
    const parser = new BinaryProtocolParser(schema2);
    parser.feed(new Uint8Array([
        0x00, 0x00,
        0xFF, 0xFE, 0x01, 0x02, 0x03, 0x04, 0x05, 0x99, 0xCC,
        0x00, 0x00,
        0xFF, 0xFE, 0x01, 0x02, 0x03, 0x04, 0x05, 0x99, 0xCC]));
    let frame = parser.parse();
    expect(frame).not.toBeNull();
    frame = parser.parse();
    expect(frame).not.toBeNull();
});

test('binary-protocol.parser test3', () => {
    const schema3 = {
        prefix: new Uint8Array([0xFF, 0xFE]),
        commandSize: <const>1,
        defaultLength: {
            mode: <const>'free',
        },
        alterDataSize: <const>1,
        crcSize: <const>0,
        suffix: new Uint8Array([0xCC]),
    };
    const parser = new BinaryProtocolParser(schema3);
    parser.feed(new Uint8Array([
        0x00, 0x00,
        0xFF, 0xFE, 0x01, 0x02, 0x03, 0x04, 0x05, 0x99, 0xCC,
        0x00, 0x00,
        0xFF, 0xFE, 0x01, 0x02, 0x03, 0x04, 0x05, 0x99, 0xCC]));
    let frame = parser.parse();
    expect(frame).not.toBeNull();
    frame = parser.parse();
    expect(frame).not.toBeNull();
});

test('binary-protocol.parser test4', () => {
    const schema4 = {

        commandSize: <const>1,
        defaultLength: {
            mode: <const>'free',
        },
        alterDataSize: <const>1,
        crcSize: <const>0,
        suffix: new Uint8Array([0xCC]),
    };
    const parser = new BinaryProtocolParser(schema4);
    parser.feed(new Uint8Array([
        0x00, 0x00,
        0xFF, 0xFE, 0x01, 0x02, 0x03, 0x04, 0x05, 0x99, 0xCC,
        0x00, 0x00,
        0xFF, 0xFE, 0x01, 0x02, 0x03, 0x04, 0x05, 0x99, 0xCC]));
    let frame = parser.parse();
    expect(frame).not.toBeNull();
    frame = parser.parse();
    expect(frame).not.toBeNull();
});

test('binary-protocol.parser test5', () => {
    const schema4 = {

        commandSize: <const>1,
        defaultLength: {
            mode: <const>'free',
        },
        alterDataSize: <const>1,
        crcSize: <const>0,
        suffix: new Uint8Array([0xCC]),
    };
    const parser = new BinaryProtocolParser(schema4);
    parser.feed(new Uint8Array([
        0x00, 0x00,
        0xFF, 0xFE, 0x01, 0x02, 0x03, 0x04, 0x05]));
    console.log(parser.parse());
    parser.feed(new Uint8Array([0x99, 0xCC,
        0x00, 0x00,
        0xFF, 0xFE, 0x01, 0x02, 0x03, 0x04, 0x05, 0x99, 0xCC]));
    let frame = parser.parse();
    expect(frame).not.toBeNull();
    frame = parser.parse();
    expect(frame).not.toBeNull();
});

test('binary-protocol.parser test6', () => {
    const schema2 = {

        commandSize: <const>1,
        prefix: new Uint8Array([0xFF, 0xFE]),

        defaultLength: {
            mode: <const>'dynamic',
            lengthSize: <const>1,
        },
        alterDataSize: <const>1,
        crcSize: <const>1,
        suffix: new Uint8Array([0xCC]),
    };
    const parser = new BinaryProtocolParser(schema2);
    parser.feed(new Uint8Array([
        0x00, 0x00,
        0xFF]));
    let frame = parser.parse();
    expect(frame).toBeNull();
    parser.feed(new Uint8Array([
        0xFE, 0x01, 0x02, 0x03, 0x04]));

    frame = parser.parse();
    expect(frame).toBeNull();
    parser.feed(new Uint8Array([
        0x05, 0x99, 0xCC,
        0x00, 0x00,
        0xFF, 0xFE, 0x01, 0x02, 0x03, 0x04, 0x05, 0x99, 0xCC]));
    frame = parser.parse();
    expect(frame).not.toBeNull();
    frame = parser.parse();
    expect(frame).not.toBeNull();
});

test('binary-protocol.parser test7', () => {
    const schema2 = {
        commandSize: <const>1,
        prefix: new Uint8Array([0xFF, 0xFE]),
        lengthSchemas: [
            {
                command: new Uint8Array([0x01]), length: {
                    mode: <const>'fixed',
                    length: 2,
                }
            },
            {
                command: new Uint8Array([0x03]), length: {
                    mode: <const>'fixed',
                    length: 0,
                }
            },
        ],
        defaultLength: {
            mode: <const>'fixed',
            length: 4,
        },
        alterDataSize: <const>1,
        crcSize: <const>1,
        suffix: new Uint8Array([0xCC]),

    };
    const parser = new BinaryProtocolParser(schema2);
    parser.feed(new Uint8Array([
        0xFF, 0xFE, 0x01,
        0xFF, 0xFE, 0x01, 0x02, 0x03, 0x04, 0x99, 0xCC,
        0x00, 0x00,
        0xFF, 0xFE, 0x02, 0x02, 0x03, 0x04, 0x05, 0x06, 0x99, 0xCC,
        0xFF, 0xFE, 0x03, 0x02, 0x99, 0xCC]));
    let frame = parser.parse();
    expect(frame).not.toBeNull();
    frame = parser.parse();
    expect(frame).not.toBeNull();
    frame = parser.parse();
    expect(frame).not.toBeNull();
    frame = parser.parse();
    expect(frame).toBeNull();
});

test('binary-protocol.parser test8', () => {
    const schema2 = {

        commandSize: <const>1,
        prefix: new Uint8Array([0xFF, 0xFE]),

        lengthSchemas: [
            {
                command: new Uint8Array([0x01]), length: {
                    mode: <const>'fixed',
                    length: 2,
                }
            },
            {
                command: new Uint8Array([0x03]), length: {
                    mode: <const>'dynamic',
                    lengthSize: <const>1,
                }
            },
        ],
        defaultLength: {
            mode: <const>'fixed',
            length: 4,
        },
        alterDataSize: <const>1,
        crcSize: <const>1,
        suffix: new Uint8Array([0xCC]),

    };
    const parser = new BinaryProtocolParser(schema2, 64);
    parser.feed(new Uint8Array([
        0xFF, 0xFE, 0x01,
        0xFF, 0xFE, 0x01, 0x02, 0x03, 0x04, 0x99, 0xCC,
        0x00, 0x00,
        0xFF, 0xFE, 0x02, 0x02, 0x03, 0x04, 0x05, 0x06, 0x99, 0xCC,
        0xFF, 0xFE, 0x03, 0x01, 0x02, 0x03, 0x99, 0xCC]));
    let frame = parser.parse();
    expect(frame).not.toBeNull();
    frame = parser.parse();
    expect(frame).not.toBeNull();
    frame = parser.parse();
    expect(frame).not.toBeNull();
    frame = parser.parse();
    expect(frame).toBeNull();
});

test('binary-protocol.frame test1', () => {
    const schema1 = {

        prefix: new Uint8Array([0xFF, 0xFE]),
        commandSize: <const>1,
        defaultLength: {
            mode: <const>'fixed',
            length: 4,
        },
        alterDataSize: <const>1,
        crcSize: <const>1,
        suffix: new Uint8Array([0xCC]),
    };
    const frame1 = BinaryProtocolFrame.create(schema1, new Uint8Array([0x0C]));
    frame1.getAlterData()?.setUint8(0, 0x0A);
    frame1.getContent()?.setUint32(0, 0x01020304);
    frame1.getCrc()?.setUint8(0, 0x99);
    expect(frame1.buffer).toEqual(new Uint8Array([
        0xFF, 0xFE, 0x0C, 0x0A, 0x01, 0x02, 0x03, 0x04, 0x99, 0xCC]));
});

test('binary-protocol.frame test2', () => {
    const schema1 = {
        prefix: new Uint8Array([0xFF, 0xFE]),
        commandSize: <const>1,
        defaultLength: {
            mode: <const>'dynamic',
            lengthSize: <const>1,
        },
        alterDataSize: <const>1,
        crcSize: <const>1,
        suffix: new Uint8Array([0xCC]),
    };
    const frame1 = BinaryProtocolFrame.create(schema1, new Uint8Array([0x0C]), 4);
    frame1.getAlterData()?.setUint8(0, 0x0A);
    frame1.getContent()?.setUint32(0, 0x01020304);
    frame1.getCrc()?.setUint8(0, 0x99);
    expect(frame1.buffer).toEqual(new Uint8Array([
        0xFF, 0xFE, 0x0C, 0x04, 0x0A, 0x01, 0x02, 0x03, 0x04, 0x99, 0xCC]));
});