# URL Parameter State Compression Plan (Realistic)

## Executive Summary

**Answer: YES, but with caveats** - Real-world GeoCalc data compresses very well with gzip. A model with 14 entities and 10 constraints (4,974 bytes originally) compresses to just **328 bytes** using gzip + optimizations, easily fitting in all modern browsers.

## Real-World Data Analysis

Testing with actual GeoCalc export (`plans/example.json`):
- **14 entities**: 5 points, 3 lines, 2 circles, 4 labels  
- **10 constraints**: Various types including radius, distance, horizontal, point-on-circle
- **Original size**: 4,974 bytes (much larger than my synthetic test data)

### Why Real Data Is Larger

| Factor | Impact | Details |
|--------|--------|---------|
| **UUID Overhead** | 36% of total size | UUIDs are 36 chars (`332ddc8e-b5a4-48a7-8d49-4e69fb566f58`) vs integers |
| **Additional Fields** | ~20% overhead | `infinite`, `visible`, `priority` fields not in test data |
| **Precise Coordinates** | ~15% overhead | Real coordinates like `0.000781830260540464` vs rounded test values |
| **Complex Constraint IDs** | ~10% overhead | IDs like `constraint-1756923098975-gev9s2i0l` and `line-length-c013bd62...` |

## Compression Results (Real Data)

| Strategy | Size | Reduction | URL Safe? |
|----------|------|-----------|-----------|
| **Original JSON** | 4,974 bytes | 0% | No (Chrome: 61%) |
| **Gzip Only** | 1,584 bytes | 68% | Yes (Chrome: 19%) |
| **Optimized + Gzip** | **328 bytes** | **93%** | **Yes (Chrome: 4%)** |

**Key insight**: Gzip alone gets 68% reduction, but the optimization step (replacing UUIDs) is crucial for the remaining 25%.

## Gzip-First Strategy (Recommended)

Based on your preference and the analysis, here's the simplified approach:

### Phase 1: Basic Gzip Implementation
Just gzip the existing JSON format with minimal changes:

```typescript
import { gzip, ungzip } from 'pako';

function compressToUrl(geometry: Geometry): string {
  const serialized = serializeGeometry(geometry); // existing function
  const json = JSON.stringify(serialized);
  const compressed = gzip(json);
  return btoa(String.fromCharCode(...compressed));
}

function decompressFromUrl(urlParam: string): Geometry {
  try {
    const binaryString = atob(urlParam);
    const compressed = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      compressed[i] = binaryString.charCodeAt(i);
    }
    const decompressed = ungzip(compressed, { to: 'string' });
    return deserializeGeometry(decompressed);
  } catch (error) {
    console.warn('Failed to decompress URL parameter:', error);
    return createEmptyGeometry();
  }
}
```

**Result for real-world example**: 1,584 bytes (68% reduction)

### Phase 2: Add UUID Optimization (Optional)
If Phase 1 size isn't good enough, add UUID → integer mapping:

**Additional Result**: 328 bytes total (93% reduction)

## Scale Projections (Gzip-Only)

Based on the real-world example ratio:

| Scale | Entities | Constraints | Estimated JSON | Gzipped | Chrome Fits? |
|-------|----------|-------------|----------------|---------|--------------|
| Small | 5-10 | 5-10 | ~2,500 bytes | ~800 bytes | ✅ YES |
| Medium | 15-20 | 15-20 | ~7,000 bytes | ~2,200 bytes | ✅ YES |
| Large | 25-35 | 25-35 | ~12,000 bytes | ~3,800 bytes | ✅ YES |
| X-Large | 40-50 | 40-50 | ~18,000 bytes | ~5,700 bytes | ✅ YES |
| Max | 60-80 | 60-80 | ~25,000 bytes | ~7,900 bytes | ⚠️ CLOSE |

**Conservative estimate**: Up to 40-50 entities/constraints fit comfortably with gzip-only approach.

## Implementation Plan (Gzip-First)

### 1. Core Compression (2-3 hours)
- [ ] Install `pako` library for browser-compatible gzip
  ```bash
  npm install pako @types/pako
  ```
- [ ] Implement `compressToUrl()` and `decompressFromUrl()` functions
- [ ] Add error handling for malformed URLs
- [ ] Test round-trip compression with real data

### 2. URL Integration (1-2 hours)  
- [ ] Add `?state=` URL parameter support
- [ ] Load geometry from URL on app initialization
- [ ] Update URL when geometry changes (debounced)
- [ ] Add "Share" button to copy URL

### 3. Size Management (1 hour)
- [ ] Check compressed size before updating URL
- [ ] Show size warning if approaching browser limits
- [ ] Fallback to localStorage if URL too large
- [ ] Display compression ratio in dev tools

### 4. Polish & Testing (1 hour)
- [ ] Test with various browser URL length limits
- [ ] Handle edge cases (empty geometry, corrupt data)
- [ ] Add loading state for decompression
- [ ] Document URL parameter format

## Dependencies

### Required
- **pako** (~45KB): Industry-standard gzip for browsers
  ```bash
  npm install pako @types/pako
  ```

### Alternative (Smaller)
- **lz-string** (~10KB): Custom compression algorithm, designed for URLs
- Trade-off: Smaller bundle size vs less compression ratio

## URL Format Design

```
https://geocalc.app/?state=H4sIAAAAAAAA_6tWSu...compressed-base64...
```

- `state`: URL parameter name
- Value: Base64-encoded gzipped JSON
- Backward compatible: Apps without URL support ignore the parameter

## Browser Compatibility

| Browser | URL Limit | Gzip-Only Capacity | With Optimization |
|---------|-----------|-------------------|-------------------|
| Internet Explorer | 2,048 bytes | ~10-15 entities | ~25-30 entities |
| Chrome/Safari | 8,192 bytes | ~40-50 entities | ~80-100 entities |
| Firefox | 65,536 bytes | ~300+ entities | ~500+ entities |

## Success Metrics

- [ ] Real-world 14+10 example fits in 1,584 bytes (✅ achieved)
- [ ] 30+30 entities/constraints fit under 4KB  
- [ ] Loading from URL takes <200ms
- [ ] Zero data corruption in round-trip tests
- [ ] Share URLs work across all modern browsers

## Risk Mitigation

| Risk | Probability | Impact | Solution |
|------|-------------|---------|----------|
| URL too long for browser | Medium | High | Size warnings + localStorage fallback |
| Gzip decompression fails | Low | Medium | Try-catch with empty geometry fallback |
| Bundle size increase | Low | Low | Pako is well-established, 45KB reasonable |
| Performance impact | Low | Medium | Debounce URL updates, async decompression |

## Comparison with Previous Plan

| Aspect | Old Plan | New Plan (Gzip-First) |
|--------|----------|----------------------|
| **Complexity** | High (custom format) | Low (mostly existing code) |
| **Compression** | 87% (504 bytes) | 68% (1,584 bytes) for same data |
| **Development Time** | 6-8 hours | 4-6 hours |
| **Maintenance** | Custom format to maintain | Standard gzip, minimal custom code |
| **Browser Support** | All | All |

## Recommendation

**Start with gzip-only approach** for these reasons:

1. **Simpler implementation**: Minimal changes to existing code
2. **Good enough compression**: 68% reduction handles most use cases  
3. **Standards-based**: Uses well-known gzip compression
4. **Easy upgrade path**: Can add UUID optimization later if needed

The 328-byte result (with optimization) is impressive, but the 1,584-byte result (gzip-only) is still excellent and much simpler to implement and maintain.

**Next Step**: Implement Phase 1 (gzip-only) and measure real-world usage patterns to determine if Phase 2 optimization is needed.