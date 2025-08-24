// Utility function to convert BigInt to string for JSON serialization
export function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ))
}

// Custom JSON response that handles BigInt
export function jsonResponse(data, options = {}) {
  const serializedData = serializeBigInt(data)
  return Response.json(serializedData, options)
}