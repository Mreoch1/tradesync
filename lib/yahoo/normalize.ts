/**
 * Yahoo API Response Normalization
 * 
 * Yahoo returns data in nested array structures like [dataObject, subResource1, subResource2, ...]
 * This module provides utilities to normalize these responses into consistent formats.
 */

/**
 * Normalize a Yahoo API node
 * 
 * Yahoo uses arrays where index 0 contains the data object.
 * This function extracts the first element if it's an array, otherwise returns the node.
 * 
 * @param node - The Yahoo API response node (may be array or object)
 * @returns The normalized data object, or null if node is invalid
 */
export function normalizeYahooNode<T = any>(node: any): T | null {
  if (!node) return null
  if (Array.isArray(node)) {
    return (node[0] ?? null) as T | null
  }
  return node as T
}

/**
 * Find first matching path in nested object structure
 * 
 * Searches through multiple possible paths to find data, useful when
 * Yahoo API structure varies between responses.
 * 
 * @param root - Root object to search
 * @param paths - Array of dot-separated paths to try (e.g., ["roster", "team.0.roster", "players"])
 * @returns The first found value, or null if none match
 * 
 * @example
 * const roster = findFirstPath(team, ["roster", "team_roster", "team.0.roster"])
 */
export function findFirstPath(root: any, paths: string[]): any {
  for (const path of paths) {
    try {
      const value = path.split('.').reduce((o: any, k: string) => {
        if (o === null || o === undefined) return null
        // Handle array indices
        if (k.match(/^\d+$/)) {
          return Array.isArray(o) ? o[parseInt(k, 10)] : null
        }
        return o?.[k]
      }, root)
      
      if (value !== null && value !== undefined) {
        return value
      }
    } catch {
      // Path doesn't exist, try next
      continue
    }
  }
  return null
}

/**
 * Extract data from Yahoo's nested array structure
 * 
 * Yahoo uses arrays like: [dataObject, subResource1, subResource2, ...]
 * This is a convenience wrapper around normalizeYahooNode for backward compatibility.
 * 
 * @deprecated Use normalizeYahooNode instead
 */
export function extractYahooData<T>(array: any[], index: number = 0): T | null {
  if (!Array.isArray(array) || array.length <= index) return null
  
  const item = array[index]
  if (!item || typeof item !== 'object') return null
  
  // If it's an array of objects, merge them into one
  if (Array.isArray(item)) {
    const merged: any = {}
    item.forEach((obj: any) => {
      if (obj && typeof obj === 'object') {
        Object.assign(merged, obj)
      }
    })
    return merged as T
  }
  
  return item as T
}

