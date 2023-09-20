

export function positionToIndex(value: string, position: {lineNumber: number, column: number}): number {
    let index = 0;
    for (let i = 1; i < position.lineNumber; i++) {
        index = value.indexOf('\n', index) + 1;
    }
    index += position.column - 1;
    return index;
}

export function matchIndexToPosition(value: string, index: number): {lineNumber: number, column: number} {
    let lineNumber = 0;
    let columnNumber = 0;
    for (let i = 0; i < index; i++) {
        if (value[i] === '\n') {
            lineNumber++;
            columnNumber = 0;
        } else {
            columnNumber++;
        }
    }
    return {lineNumber: lineNumber, column: columnNumber};
}
