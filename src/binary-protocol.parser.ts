/* eslint-disable no-bitwise */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { CircularBuffer } from 'circular-buffer-ts';
import { ProtocolParser } from './protocol-parser';
export enum ProtocolFieldRange {
    none = 0,
    perfix = 1,
    command = 1 << 1,
    length = 1 << 2,
    alterData = 1 << 3,
    content = 1 << 4,
    crc = 1 << 5,
    suffix = 1 << 6,
    all = 0x7F,

}

/**
 * @brief
 * fixed   :
 * |  prefix  | (cmd)          | (alterData) | (content) | (crc) | (suffix) |
 * dynamic :
 * |  prefix  | (cmd) | length | (alterData) | (content) | (crc) | (suffix) |
 * free    :
 * | (prefix) | (cmd)          | (alterData) | (content)         |  suffix  |
 */


interface FixedLengthSchema {
    mode: 'fixed';
    length: number;
}

interface DynamicLengthSchema {
    mode: 'dynamic';
    lengthSize: 1 | 2 | 4;
    lengthEndian?: 'little' | 'big';
    lengthRange?: ProtocolFieldRange;
}

interface FreeLengthSchema {
    mode: 'free';
}

interface LengthSchemaDefinition {
    command: Uint8Array;
    length: FixedLengthSchema | DynamicLengthSchema;
}

export interface BinaryProtocolSchema {
    prefix?: Uint8Array;
    commandSize: 0 | 1 | 2 | 3 | 4;
    lengthSchemas?: LengthSchemaDefinition[];
    defaultLength: FixedLengthSchema | DynamicLengthSchema | FreeLengthSchema;
    alterDataSize: 0 | 1 | 2 | 3 | 4;
    crcSize: 0 | 1 | 2 | 3 | 4;
    crcRange?: ProtocolFieldRange;
    crcEndian?: 'little' | 'big';
    suffix?: Uint8Array;
}

function getContentOverhead(schema: BinaryProtocolSchema, lengthSchema: FixedLengthSchema | DynamicLengthSchema | FreeLengthSchema): number {
    let oh = 0;
    if (lengthSchema.mode === 'fixed') {
        oh += schema.prefix!.length;
        oh += schema.commandSize;
        oh += schema.alterDataSize;
        oh += schema.crcSize;
        oh += schema.suffix?.length ?? 0;
    } else if (lengthSchema.mode === 'dynamic') {
        oh += schema.prefix!.length;
        oh += schema.commandSize;
        oh += lengthSchema.lengthSize;
        oh += schema.alterDataSize;
        oh += schema.crcSize;
        oh += schema.suffix?.length ?? 0;
    } else if (lengthSchema.mode === 'free') {
        oh += schema.prefix?.length ?? 0;
        oh += schema.commandSize;
        oh += schema.alterDataSize;
        oh += schema.suffix?.length ?? 0;
    }
    return oh;
}

function getDynamicLengthOverhead(schema: BinaryProtocolSchema, lengthSchema: DynamicLengthSchema): number {
    let oh = 0;
    const lengthRange = lengthSchema.lengthRange ?? ProtocolFieldRange.content;
    if (lengthRange & ProtocolFieldRange.perfix) {
        oh += schema.prefix?.length ?? 0;
    }
    if (lengthRange & ProtocolFieldRange.command) {
        oh += schema.commandSize;
    }
    if (lengthRange & ProtocolFieldRange.length) {
        oh += lengthSchema.lengthSize;
    }
    if (lengthRange & ProtocolFieldRange.alterData) {
        oh += schema.alterDataSize;
    }
    if (lengthRange & ProtocolFieldRange.crc) {
        oh += schema.crcSize;
    }
    if (lengthRange & ProtocolFieldRange.suffix) {
        oh += schema.suffix?.length ?? 0;
    }
    return oh;
}

function getLength(schema: BinaryProtocolSchema, lengthSchema: FixedLengthSchema | DynamicLengthSchema | FreeLengthSchema, contentLength?: number): number {
    if (lengthSchema.mode === 'fixed') {
        return getContentOverhead(schema, lengthSchema) + lengthSchema.length;
    } else if (lengthSchema.mode === 'dynamic') {
        return (contentLength ?? 0) + getContentOverhead(schema, lengthSchema);
    } else {
        return (contentLength ?? 0) + getContentOverhead(schema, lengthSchema);
    }
}

function matchLengthSchema(schema: BinaryProtocolSchema, command?: Uint8Array): FixedLengthSchema | DynamicLengthSchema | FreeLengthSchema {
    if (command === undefined) {
        schema.defaultLength;
    }
    const def = (schema.lengthSchemas ?? []).find((def) => {
        for (let j = 0; j < def.command.length; j++) {
            if (def.command[j] !== command![j]) {
                return false;
            }
        }
        return true;
    });
    return def?.length ?? schema.defaultLength;
}



export interface BinaryProtocolFrameSegment {
    offset: number;
    length: number;
}

export class BinaryProtocolFrame {

    public prefixSeg: BinaryProtocolFrameSegment;
    public commandSeg: BinaryProtocolFrameSegment;
    public lengthSeg: BinaryProtocolFrameSegment;
    public alterDataSeg: BinaryProtocolFrameSegment;
    public contentSeg: BinaryProtocolFrameSegment;
    public crcSeg: BinaryProtocolFrameSegment;
    public suffixSeg: BinaryProtocolFrameSegment;
    public buffer?: Uint8Array;
    constructor() {
        this.prefixSeg = { offset: 0, length: 0 };
        this.commandSeg = { offset: 0, length: 0 };
        this.lengthSeg = { offset: 0, length: 0 };
        this.alterDataSeg = { offset: 0, length: 0 };
        this.contentSeg = { offset: 0, length: 0 };
        this.crcSeg = { offset: 0, length: 0 };
        this.suffixSeg = { offset: 0, length: 0 };
    }

    public static create(schema: BinaryProtocolSchema,
        command?: Uint8Array, contentLength?: number): BinaryProtocolFrame {
        const lengthSchema = matchLengthSchema(schema, command);
        if (lengthSchema.mode === 'fixed') {
            if (contentLength === undefined) {
                contentLength = lengthSchema.length;
            }
            if (contentLength !== lengthSchema.length) {
                throw new Error(`content length ${contentLength} not match fixed length schema ${lengthSchema.length}`);
            }
        }
        const len = getLength(schema, lengthSchema, contentLength);
        const frame = new BinaryProtocolFrame();
        frame.buffer = new Uint8Array(len);
        const view = new DataView(frame.buffer.buffer);
        let offset = 0;
        frame.prefixSeg.offset = offset;
        frame.prefixSeg.length = schema.prefix?.length ?? 0;
        offset += frame.prefixSeg.length;
        if (schema.prefix !== undefined) {
            frame.buffer.set(schema.prefix!, frame.prefixSeg.offset);
        }

        frame.commandSeg.offset = offset;
        frame.commandSeg.length = schema.commandSize;
        offset += frame.commandSeg.length;
        if (command !== undefined && schema.commandSize > 0) {
            frame.buffer.set(command, frame.commandSeg.offset);
        }

        frame.lengthSeg.offset = offset;
        frame.lengthSeg.length = lengthSchema.mode === 'dynamic' ? (lengthSchema as DynamicLengthSchema).lengthSize : 0;
        offset += frame.lengthSeg.length;
        if (lengthSchema.mode === 'dynamic') {
            const dynamicLengthOverhead = getDynamicLengthOverhead(schema, lengthSchema);
            if (lengthSchema.lengthSize == 1) {
                view.setUint8(frame.lengthSeg.offset, contentLength! + dynamicLengthOverhead);
            }
            else if (lengthSchema.lengthSize == 2) {
                view.setUint16(frame.lengthSeg.offset, contentLength! + dynamicLengthOverhead, lengthSchema.lengthEndian === 'little');
            }
            else if (lengthSchema.lengthSize == 4) {
                view.setUint32(frame.lengthSeg.offset, contentLength! + dynamicLengthOverhead, lengthSchema.lengthEndian === 'little');
            }
        }

        frame.alterDataSeg.offset = offset;
        frame.alterDataSeg.length = schema.alterDataSize;
        offset += frame.alterDataSeg.length;

        frame.contentSeg.offset = offset;
        frame.contentSeg.length = contentLength!;
        offset += frame.contentSeg.length;

        frame.crcSeg.offset = offset;
        frame.crcSeg.length = schema.crcSize;
        offset += frame.crcSeg.length;

        frame.suffixSeg.offset = offset;
        frame.suffixSeg.length = schema.suffix?.length ?? 0;
        offset += frame.suffixSeg.length;
        if (schema.suffix !== undefined) {
            frame.buffer.set(schema.suffix!, frame.suffixSeg.offset);
        }
        return frame;
    }
    public getPrefix(): DataView | null {
        return new DataView(this.buffer!.buffer, this.prefixSeg.offset, this.prefixSeg.length);
    }

    public getCommand(): DataView | null {
        return new DataView(this.buffer!.buffer, this.commandSeg.offset, this.commandSeg.length);
    }

    public getLength(): DataView | null {
        return new DataView(this.buffer!.buffer, this.lengthSeg.offset, this.lengthSeg.length);
    }

    public getAlterData(): DataView | null {
        return new DataView(this.buffer!.buffer, this.alterDataSeg.offset, this.alterDataSeg.length);
    }

    public getContent(): DataView | null {
        return new DataView(this.buffer!.buffer, this.contentSeg.offset, this.contentSeg.length);
    }

    public getCrc(): DataView | null {
        return new DataView(this.buffer!.buffer, this.crcSeg.offset, this.crcSeg.length);
    }

    public getSuffix(): DataView | null {
        return new DataView(this.buffer!.buffer, this.suffixSeg.offset, this.suffixSeg.length);
    }

}

export enum ParserStage {
    INIT = 0, // schema is changed, reset everything, reparse current buffer.
    PREPARING,      // Prepare to parse a new message.
    SEEKING_PREFIX, // try to seek the message's begin flags.
    PARSING_CMD,    // try to parse cmd of the message.
    PARSING_LENGTH, // try to parse the length of the message.
    PARSING_ALTERDATA,
    SEEKING_CONTENT, // try to
    SEEKING_CRC,
    MATCHING_SUFFIX,
    DONE,
}


export class BinaryProtocolParser implements ProtocolParser<Uint8Array, BinaryProtocolFrame>{
    private _buffer: CircularBuffer;

    private _stage: ParserStage = ParserStage.INIT;
    private _offset = 0;
    private _freeContentStartIndex = 0;
    private _lengthSchema?: FixedLengthSchema | DynamicLengthSchema | FreeLengthSchema;
    private _contentLength = 0;
    private _contentOverhead = 0;
    private _frame?: BinaryProtocolFrame;
    private _command?: Uint8Array;
    private _schema: BinaryProtocolSchema;
    constructor(schema: BinaryProtocolSchema, private maxPackageSize: number = 1024) {
        this._buffer = new CircularBuffer(maxPackageSize);
        this._schema = schema;
        this.checkSchema();
    }

    public feed(data: Uint8Array): void {
        this._buffer.write(data);

    }

    private checkSchema(): void {
        if (this._schema.crcSize > 0) {
            this._schema.crcEndian = this._schema.crcEndian ?? 'big';
        }
        if (this._schema.lengthSchemas && this._schema.lengthSchemas.length > 0) {
            if (this._schema.commandSize === 0) {
                throw new Error("Multi length schema is not supported when command size is 0.");
            }
            this._schema.lengthSchemas.forEach((def) => { this.checkLengthSchema(def.length); });
        }
        this.checkLengthSchema(this._schema.defaultLength);
    }

    private checkLengthSchema(lengthSchema: FixedLengthSchema | DynamicLengthSchema | FreeLengthSchema): void {

        switch (lengthSchema.mode) {
            case 'fixed':
                if ((this._schema.prefix?.length ?? 0) == 0) {
                    throw new Error("Fixed length schema is not supported when prefix is empty.");
                }

                break;
            case 'dynamic':
                if ((this._schema.prefix?.length ?? 0) == 0) {
                    throw new Error("Dynamic length schema is not supported when prefix is empty.");
                }
                lengthSchema.lengthEndian = lengthSchema.lengthEndian ?? 'big';
                break;
            case 'free':
                if ((this._schema.suffix?.length ?? 0) == 0) {
                    throw new Error("Free length schema is not supported when suffix is empty.");
                }
                if (this._schema.crcSize !== 0) {
                    throw new Error("Free length schema is not supported when crc is enabled.");
                }
                break;
            default:
                break;
        }
    }

    /**
     * Seek the buffer for pattern. Return the offset of the match position, return null if not enough buffer.
     * @param pattern 
     * @returns 
     */
    private seek(pattern: Uint8Array): boolean {
        const totalLength = this._buffer.getSize();
        let offset = this._offset;
        while ((offset + pattern.length) <= totalLength) {
            let matched = true;
            for (let i = 0; i < pattern.length; ++i) {
                if (pattern[i] != this._buffer.peekOne(offset + i)) {
                    matched = false;
                    break;
                }
            }
            if (matched) {
                this._offset = offset;
                return true;
            }
            offset++;
        }
        this._offset = offset;
        return false;
    }

    /**
     * Match the head of the buffer. 
     * @note 
     * @param pattern 
     * @returns Return null if not enough data, return true if matched, return false if not matched.
     */
    private match(pattern: Uint8Array): boolean | null {
        const totalLength = this._buffer.getSize();
        if (this._offset + pattern.length > totalLength) {
            return null;
        }
        for (let i = 0; i < pattern.length; ++i) {
            if (pattern[i] != this._buffer.peekOne(this._offset + i)) {
                return false;
            }
        }
        this._offset += pattern.length;
        return true;
    }

    private fetch(length: number): Uint8Array | null {
        if (this._offset + length > this._buffer.getSize()) {
            return null;
        }
        const data = this._buffer.peek(this._offset, length);
        this._offset += length;
        return data;

    }

    private move(length: number): boolean {
        if (this._offset + length > this._buffer.getSize()) {
            return false;
        }
        this._offset += length;
        return true;
    }

    private remove(length: number): boolean {
        if (length > this._buffer.getSize()) {
            return false;
        }
        this._buffer.readVirtual(length);
        this._offset -= length;
        return true;
    }

    public reset() {
        this._stage = ParserStage.INIT;
    }

    public parse(): BinaryProtocolFrame | null {
        let stage = this._stage;

        let needNewEpic = false;
        do {
            needNewEpic = false;
            if (stage === ParserStage.INIT) {
                this._offset = 0;

                stage = ParserStage.PREPARING;
            }
            if (stage === ParserStage.PREPARING) {
                this._frame = new BinaryProtocolFrame();
                this._freeContentStartIndex = 0;
                this._contentLength = 0;
                this._command = undefined;
                stage = ParserStage.SEEKING_PREFIX;
            }
            if (stage === ParserStage.SEEKING_PREFIX) {
                if ((this._schema.prefix?.length ?? 0) > 0) {
                    this._frame!.prefixSeg.offset = 0;
                    const result = this.seek(this._schema.prefix!);
                    if (result) {
                        // found prefix
                        this.remove(this._offset);
                        this.move(this._schema.prefix!.length);

                        this._frame!.prefixSeg.length = this._schema.prefix!.length;
                        stage = ParserStage.PARSING_CMD;

                    } else {
                        // not found prefix
                        // stay in this stage, and wait for more data.
                    }
                } else {
                    stage = ParserStage.PARSING_CMD;
                }
            }
            if (stage === ParserStage.PARSING_CMD) {
                if (this._schema.commandSize > 0) {
                    this._frame!.commandSeg.offset = this._offset;
                    const cmd = this.fetch(this._schema!.commandSize);
                    if (cmd) {
                        this._command = cmd;
                        this._frame!.commandSeg.length = this._schema.commandSize;
                        stage = ParserStage.PARSING_LENGTH;
                    } else {
                        // Not enough data to parse command, stay in this stage.
                    }
                } else {
                    this._command = undefined;
                    stage = ParserStage.PARSING_LENGTH;
                }
            }
            if (stage === ParserStage.PARSING_LENGTH) {
                this._lengthSchema = matchLengthSchema(this._schema, this._command);
                this._contentOverhead = getContentOverhead(this._schema, this._lengthSchema);

                if (this._lengthSchema.mode === 'fixed') {
                    this._contentLength = this._lengthSchema.length;
                    if ((this._contentLength + this._contentOverhead) > this.maxPackageSize) {
                        this._buffer.readVirtual(1);
                        this._offset = 0;
                        stage = ParserStage.PREPARING;
                        needNewEpic = true;
                    } else {
                        stage = ParserStage.PARSING_ALTERDATA;
                    }
                } else if (this._lengthSchema.mode === 'dynamic') {
                    this._frame!.lengthSeg.offset = this._offset;
                    const lengthBuf = this.fetch(this._lengthSchema.lengthSize);
                    if (lengthBuf) {
                        const lengthOverhead = getDynamicLengthOverhead(this._schema, this._lengthSchema);
                        this._contentLength = this.parseLength(this._lengthSchema, lengthBuf) - lengthOverhead;
                        // check length limitation.
                        if ((this._contentLength + this._contentOverhead) > this.maxPackageSize) {
                            this._buffer.readVirtual(1);
                            this._offset = 0;
                            stage = ParserStage.PREPARING;
                            needNewEpic = true;
                        } else {
                            this._frame!.lengthSeg.length = this._lengthSchema.lengthSize;
                            stage = ParserStage.PARSING_ALTERDATA;
                        }
                    } else {
                        // Not enough data to parse length, stay in this stage.
                    }
                } else {
                    // free length mode, no length field.
                    stage = ParserStage.PARSING_ALTERDATA;
                }
            }

            if (stage === ParserStage.PARSING_ALTERDATA) {
                if (this._schema.alterDataSize > 0) {
                    this._frame!.alterDataSeg.offset = this._offset;
                    const result = this.move(this._schema.alterDataSize);
                    if (result) {
                        this._frame!.alterDataSeg.length = this._schema.alterDataSize;
                        stage = ParserStage.SEEKING_CONTENT;
                    } else {
                        // Not enough data to parse command, stay in this stage.
                    }
                } else {
                    stage = ParserStage.SEEKING_CONTENT;
                }
            }

            if (stage === ParserStage.SEEKING_CONTENT) {

                if (this._lengthSchema!.mode !== 'free') {
                    if (this._contentLength > 0) {
                        this._frame!.contentSeg.offset = this._offset;
                        const result = this.move(this._contentLength);
                        if (result) {
                            this._frame!.contentSeg.length = this._contentLength;
                            stage = ParserStage.SEEKING_CRC;
                        } else {
                            // Not enough data for content, stay in this stage.
                        }
                    } else {
                        stage = ParserStage.SEEKING_CRC;
                    }
                } else {
                    // free mode
                    // record the start index.
                    this._freeContentStartIndex = this._offset;
                    this._frame!.contentSeg.offset = this._freeContentStartIndex;
                    // not support crc, so skip crc stage.
                    stage = ParserStage.MATCHING_SUFFIX;
                }
            }

            if (stage === ParserStage.SEEKING_CRC) {
                if (this._schema.crcSize > 0) {
                    this._frame!.crcSeg.offset = this._offset;
                    const result = this.move(this._schema.crcSize);
                    if (result) {
                        this._frame!.crcSeg.length = this._schema.crcSize;
                        stage = ParserStage.MATCHING_SUFFIX;
                    } else {
                        // Not enough data for crc, stay in this stage.
                    }
                } else {
                    stage = ParserStage.MATCHING_SUFFIX;
                }
            }

            if (stage === ParserStage.MATCHING_SUFFIX) {
                if (this._lengthSchema!.mode !== 'free') {
                    if ((this._schema.suffix?.length ?? 0) > 0) {
                        this._frame!.suffixSeg.offset = this._offset;
                        const result = this.match(this._schema.suffix!);
                        if (result == null) {
                            // not enough buffer, stay in this stage.
                        } else if (result) {
                            this._frame!.suffixSeg.length = this._schema.suffix!.length;
                            stage = ParserStage.DONE;
                            // success
                        } else {
                            // mismatch
                            // discard one data that has been parsed.
                            this._buffer.readVirtual(1);
                            this._offset = 0;
                            stage = ParserStage.PREPARING;
                            needNewEpic = true;
                        }
                    } else {
                        stage = ParserStage.DONE;
                    }
                } else {
                    // free mode
                    const result = this.seek(this._schema.suffix!);
                    if (this._offset - this._freeContentStartIndex + this._contentOverhead > this.maxPackageSize) {
                        // discard one data that has been parsed.
                        this._buffer.readVirtual(1);
                        this._offset = 0;
                        stage = ParserStage.PREPARING;
                        needNewEpic = true;
                    }
                    if (result) {
                        this._contentLength = this._offset - this._freeContentStartIndex;
                        this._frame!.contentSeg.length = this._contentLength;
                        this._frame!.suffixSeg.offset = this._offset;
                        this.move(this._schema.suffix!.length);
                        this._frame!.suffixSeg.length = this._schema.suffix!.length;
                        stage = ParserStage.DONE;
                    } else {
                        // suffix not found, stay in this stage.
                    }
                }
            }

            if (stage === ParserStage.DONE) {
                this._frame!.buffer = this._buffer.read(this._offset);
                this._offset = 0;
                stage = ParserStage.PREPARING;

                this._stage = stage;
                return this._frame!;
            }

        } while (needNewEpic);
        this._stage = stage;
        return null;

    }



    private parseLength(lengthSchema: DynamicLengthSchema,
        buf: Uint8Array) {
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        if (lengthSchema.lengthSize === 1) {
            return view.getUint8(0);
        } else if (lengthSchema.lengthSize === 2) {
            return view.getUint16(0, lengthSchema.lengthEndian === 'little');
        } else if (lengthSchema.lengthSize === 4) {
            return view.getUint32(0, lengthSchema.lengthEndian === 'little');
        } else {
            return 0;
        }
    }
}
