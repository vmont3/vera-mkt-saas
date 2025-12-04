export function generateTruncatedHash(
    masterHash: string,
    targetBits: number = 128
): string {
    const hexChars = targetBits / 4;
    return masterHash.substring(0, hexChars);
}
