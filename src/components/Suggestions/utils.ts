

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

export function getCursorPositionClause(value: string, cursorPosition: {lineNumber: number, column: number}): {clause: string, index: number} {
    // Get the current clause based on the cursor position, or START if no clause is found or the cursor is at
    // the start of the query (; or ()). The regex matches the last occurrence of a clause keyword before the cursor.
    const clausePattern = new RegExp("(select|use|from|where|group by|order by|\\s\\(|;)(?![\\s\\S]*(select|use|from|where|group by|order by|\\s\\(|;))", "i");
    const cursorIndex = positionToIndex(value, cursorPosition);
    const match = clausePattern.exec(value.substring(0, cursorIndex));
    if (match !== null) {
        const clause = match[1].includes("(") || match[1].includes(";") ? "START" : match[1];
        return {
            clause: clause,
            index: match.index
        };
    }
    return {
        clause: "START",
        index: 0
    };
}
