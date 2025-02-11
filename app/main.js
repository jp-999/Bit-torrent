const process = require("process");
const util = require("util");
// Examples:
// - decodeBencode("5:hello") -> "hello"
// - decodeBencode("10:hello12345") -> "hello12345"
function decodeBencode(bencodedValue) {
    if (bencodedValue[0] === 'i') {
        // Decode integer
        const endIndex = bencodedValue.indexOf('e');
        const numberStr = bencodedValue.substring(1, endIndex);
        
        // Validate integer format
        if (numberStr.length === 0) {
            throw new Error("Invalid integer encoding: empty number");
        }
        if (numberStr.length > 1 && numberStr[0] === '0') {
            throw new Error("Invalid integer encoding: leading zeros");
        }
        if (numberStr.length > 1 && numberStr[0] === '-' && numberStr[1] === '0') {
            throw new Error("Invalid integer encoding: negative zero");
        }
        
        return parseInt(numberStr, 10);
    }
    
    if (bencodedValue[0] === 'l') {
        // Decode list
        const list = [];
        let index = 1; // Start after the 'l'
        
        while (index < bencodedValue.length && bencodedValue[index] !== 'e') {
            const { value, length } = decodeNextElement(bencodedValue.slice(index));
            if (Array.isArray(value) && value.length === 1) {
                // Special case for nested lists with single elements
                list.push([value[0]]);
            } else {
                list.push(value);
            }
            index += length;
        }
        
        return list;
    }
    
    if (!isNaN(bencodedValue[0])) {
        // Decode string
        const colonIndex = bencodedValue.indexOf(':');
        const length = parseInt(bencodedValue.substring(0, colonIndex), 10);
        return bencodedValue.substr(colonIndex + 1, length);
    }
    
    throw new Error("Only strings, integers, and lists are supported");
}

function decodeNextElement(bencodedValue) {
    if (bencodedValue[0] === 'i') {
        // Decode integer
        const endIndex = bencodedValue.indexOf('e');
        const numberStr = bencodedValue.substring(1, endIndex);
        return {
            value: parseInt(numberStr, 10),
            length: endIndex + 1
        };
    }
    
    if (bencodedValue[0] === 'l') {
        // Decode list
        const list = [];
        let index = 1;
        
        while (index < bencodedValue.length && bencodedValue[index] !== 'e') {
            const { value, length } = decodeNextElement(bencodedValue.slice(index));
            list.push(value);
            index += length;
        }
        
        return {
            value: list,
            length: index + 1
        };
    }
    
    if (!isNaN(bencodedValue[0])) {
        // Decode string
        const colonIndex = bencodedValue.indexOf(':');
        const length = parseInt(bencodedValue.substring(0, colonIndex), 10);
        return {
            value: bencodedValue.substr(colonIndex + 1, length),
            length: colonIndex + 1 + length
        };
    }
    
    throw new Error("Only strings, integers, and lists are supported");
}

function main() {
    const command = process.argv[2];
    if (command === "decode") {
        const bencodedValue = process.argv[3];
        console.log(JSON.stringify(decodeBencode(bencodedValue)));
    } else {
        throw new Error(`Unknown command ${command}`);
    }
}

main();