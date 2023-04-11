

export interface ProtocolParser<Tin, Tout> {
    feed(data: Tin): void,
    parse(): Tout | null;
}