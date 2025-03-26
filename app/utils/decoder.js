// Function to parse an integer from a bencoded buffer starting at a given offset
function parseInteger(buffer, offset) {
  let cursor = offset;

  // Confirm the first character is the letter 'i'
  const firstCharacter = String.fromCharCode(buffer.readInt8(cursor));
  cursor++;

  if (firstCharacter !== 'i') {
    throw new Error('Invalid number encoding. Invalid first character');
  }

  // Find the position of the terminator character 'e'
  const terminatorPosition = buffer.indexOf('e', cursor);

  if (terminatorPosition === -1) {
    throw new Error('Invalid number encoding. Missing terminator character');
  }

  // Extract the number string and convert it to a number
  const result = buffer.subarray(cursor, terminatorPosition).toString();
  cursor += result.length + 1;

  return { value: Number(result), newCursor: cursor }; // Return the parsed value and new cursor position
}

// Function to parse a byte string from a bencoded buffer starting at a given offset
function parseByteString(bencodedValue, offset) {
  let cursor = offset;
  const delimiterPosition = bencodedValue.indexOf(':', cursor);

  if (delimiterPosition === -1) {
    throw new Error('Invalid string encoding. Missing colon delimiter.');
  }

  // Get the length of the string
  const stringLength = Number(bencodedValue.subarray(cursor, delimiterPosition));
  cursor += stringLength.toString().length + 1;

  // Extract the string value
  const value = bencodedValue.subarray(cursor, cursor + stringLength);
  cursor += value.length;

  return { value, newCursor: cursor }; // Return the parsed value and new cursor position
}

// Function to parse a list from a bencoded buffer starting at a given offset
function parseList(buffer, offset = 0) {
  let cursor = offset;
  cursor++; // Skip the first character since we've already read it previously

  const values = []; // Array to hold the parsed values

  do {
    const currentChar = String.fromCharCode(buffer.readInt8(cursor));

    if (isNaN(currentChar)) {
      if (currentChar === 'i') {
        const { value, newCursor } = parseInteger(buffer, cursor);
        cursor = newCursor;
        values.push(value); // Add the parsed integer to the values array
      }
      if (currentChar === 'l') {
        const { values: nestedValues, newCursor } = parseList(buffer, cursor);
        cursor = newCursor;
        values.push(nestedValues); // Add the nested list to the values array
      }

      if (currentChar === 'e') {
        // Terminator character found at the end of the list
        cursor++;
        break;
      }
    } else {
      const { value, newCursor } = parseByteString(buffer, cursor);
      cursor = newCursor;
      values.push(value); // Add the parsed string to the values array
    }
  } while (cursor < buffer.length);

  return { values, newCursor: cursor }; // Return the parsed values and new cursor position
}

// Function to parse a dictionary from a bencoded buffer starting at a given offset
function parseDictionary(buffer, offset) {
  let cursor = offset;
  cursor++; // Skip the first character since we've already read it previously

  const values = {}; // Object to hold the parsed key-value pairs
  do {
    let currentChar = String.fromCharCode(buffer.readInt8(cursor));

    // Get the key
    let dictionaryKey;
    if (isNaN(currentChar)) {
      if (currentChar === 'e') {
        cursor++;
        break; // End of dictionary
      } else {
        throw new Error(`Invalid key encoding found for dictionary: ${buffer.toString()}`);
      }
    } else {
      const { value, newCursor } = parseByteString(buffer, cursor);
      cursor = newCursor;
      dictionaryKey = value.toString(); // Convert the key to a string
    }

    currentChar = String.fromCharCode(buffer.readInt8(cursor));

    let dictionaryValue;
    if (isNaN(currentChar)) {
      if (currentChar === 'i') {
        const { value, newCursor } = parseInteger(buffer, cursor);
        cursor = newCursor;
        dictionaryValue = value; // Store the parsed integer as the value
      } else if (currentChar === 'l') {
        const { values, newCursor } = parseList(buffer, cursor);
        cursor = newCursor;
        dictionaryValue = values; // Store the parsed list as the value
      } else if (currentChar === 'd') {
        const { values, newCursor } = parseDictionary(buffer, cursor);
        cursor = newCursor;
        dictionaryValue = values; // Store the parsed dictionary as the value
      } else {
        throw new Error(`Invalid value encoding found for dictionary: ${buffer.toString()}`);
      }
    } else {
      const { value, newCursor } = parseByteString(buffer, cursor);
      cursor = newCursor;
      dictionaryValue = value; // Store the parsed string as the value
    }
    values[dictionaryKey] = dictionaryValue; // Add the key-value pair to the dictionary
  } while (cursor < buffer.length);
  
  return { values, newCursor: cursor }; // Return the parsed dictionary and new cursor position
}

// Function to decode a bencoded buffer
function decodeBencode(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Invalid parameter type. Parameter must be a buffer');
  }

  const firstCharacter = String.fromCharCode(buffer.readInt8(0));
  const lastCharacter = String.fromCharCode(buffer.readInt8(buffer.length - 1));

  // Determine the type of the bencoded value based on the first character
  if (isNaN(firstCharacter)) {
    if (firstCharacter === 'i') {
      const { value } = parseInteger(buffer, 0);
      return value; // Return the parsed integer
    }
    if (firstCharacter === 'l' && lastCharacter === 'e') {
      const { values } = parseList(buffer, 0);
      return values; // Return the parsed list
    }

    if (firstCharacter === 'd') {
      const { values } = parseDictionary(buffer, 0);
      return values; // Return the parsed dictionary
    }

    throw new Error(`Invalid value ${buffer}. Unsupported encoding.`);
  } else {
    const { value } = parseByteString(buffer, 0);
    return value; // Return the parsed string
  }
}

// Export the decodeBencode function for use in other modules
module.exports = { decodeBencode };
