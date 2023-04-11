import { ProtocolParser } from './protocol-parser';




export class ASCIIProtocolParser implements ProtocolParser<string, Map<string, string>> {

    private _buffer = "";
    private _searchIndex = 0;

    public feed(data: string): void {
        this._buffer += data;
    }

    public parse(): Map<string, string> | null {
        const eIdx = this._buffer.indexOf('\n', this._searchIndex);
        if (eIdx === -1) {
            this._searchIndex = this._buffer.length;
            return null;
        }

        const items = new Map<string, string>();
        this._buffer.slice(0, eIdx).trim().split(',')
            .forEach((itemStr) => {
                itemStr = itemStr.trim();
                const item = itemStr.split('=');
                if (item.length == 2) {
                    items.set(item[0], item[1]);
                }
            });
        this._buffer = this._buffer.substring(eIdx + 1, this._buffer.length);
        this._searchIndex = 0;
        if (items.size === 0) {
            return null;
        }
        return items;
    }
}

