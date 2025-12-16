# Performance Optimizations

This document describes the performance optimizations implemented in the Zena PWA frontend.

## Overview

The following optimizations have been implemented to meet the performance requirements:
- Initial load time < 2 seconds (Requirement 23.1)
- Navigation time < 500ms (Requirement 23.4)
- Large thread list pagination (Requirement 23.5)

## Implemented Optimizations

### 1. Lazy Loading and Code Splitting

**Location**: `src/App.tsx`

All route components are now lazy-loaded using React's `lazy()` and `Suspense`:

```typescript
const HomePage = lazy(() => import('./pages/HomePage/HomePage'));
const FocusPage = lazy(() => import('./pages/FocusPage/FocusPage'));
// ... other pages
```

**Benefits**:
- Reduces initial bundle size
- Only loads code for the current route
- Improves initial load time

### 2. Loading Skeletons

**Location**: `src/components/ListSkeleton/`

Provides visual feedback during data loading with animated skeleton screens:

```typescript
<ListSkeleton count={5} />
```

**Benefits**:
- Better perceived performance
- Reduces layout shift
- Improves user experience

### 3. Pagination Component

**Location**: `src/components/Pagination/`

Reusable pagination component for large lists:

```typescript
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={goToPage}
  itemsPerPage={20}
  totalItems={items.length}
/>
```

**Benefits**:
- Limits DOM nodes rendered at once
- Improves rendering performance
- Reduces memory usage

### 4. Pagination Hook

**Location**: `src/hooks/usePagination.ts`

Custom hook for managing pagination state:

```typescript
const {
  currentPage,
  totalPages,
  paginatedItems,
  goToPage,
} = usePagination({ items, itemsPerPage: 20 });
```

**Benefits**:
- Reusable pagination logic
- Automatic item slicing
- Memoized results

### 5. Virtual List Component

**Location**: `src/components/VirtualList/`

Renders only visible items in large lists:

```typescript
<VirtualList
  items={threads}
  itemHeight={100}
  renderItem={(thread) => <ThreadCard thread={thread} />}
/>
```

**Benefits**:
- Handles thousands of items efficiently
- Only renders visible items
- Smooth scrolling performance

### 6. Lazy Image Loading

**Location**: `src/components/LazyImage/`

Images load only when they enter the viewport:

```typescript
<LazyImage
  src="/path/to/image.jpg"
  alt="Description"
/>
```

**Benefits**:
- Reduces initial page weight
- Saves bandwidth
- Improves load time

### 7. Performance Monitoring

**Location**: `src/utils/performance.ts`, `src/hooks/usePerformance.ts`

Tracks load and navigation performance:

```typescript
// In main.tsx
performanceMonitor.measureLoadTime();

// In components
useNavigationPerformance('HomePage');
```

**Benefits**:
- Identifies performance bottlenecks
- Validates performance requirements
- Development-time insights

### 8. Bundle Optimization

**Location**: `vite.config.ts`

Configured manual code splitting for better caching:

```typescript
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'ui-components': [/* common components */],
}
```

**Benefits**:
- Better browser caching
- Smaller individual chunks
- Faster subsequent loads

## Usage Examples

### Using Pagination in a Page

```typescript
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination/Pagination';
import { ListSkeleton } from '@/components/ListSkeleton/ListSkeleton';

export const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
  } = usePagination({
    items: contacts,
    itemsPerPage: 20,
  });

  if (loading) {
    return <ListSkeleton count={5} />;
  }

  return (
    <div>
      {paginatedItems.map(contact => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        itemsPerPage={20}
        totalItems={contacts.length}
      />
    </div>
  );
};
```

### Using Virtual List for Large Datasets

```typescript
import { VirtualList } from '@/components/VirtualList/VirtualList';

export const ThreadsPage: React.FC = () => {
  const [threads, setThreads] = useState([]);

  return (
    <VirtualList
      items={threads}
      itemHeight={120}
      renderItem={(thread, index) => (
        <ThreadCard thread={thread} />
      )}
      overscan={3}
    />
  );
};
```

### Tracking Navigation Performance

```typescript
import { useNavigationPerformance } from '@/hooks/usePerformance';

export const HomePage: React.FC = () => {
  useNavigationPerformance('HomePage');

  return <div>Home Page Content</div>;
};
```

## Performance Targets

| Metric | Target | Implementation |
|--------|--------|----------------|
| Initial Load | < 2s | Lazy loading, code splitting, bundle optimization |
| Navigation | < 500ms | Route-based code splitting, loading skeletons |
| Large Lists | Responsive | Pagination, virtual scrolling |

## Testing Performance

### Development Mode

Performance metrics are logged to the console in development mode:

```
[Performance] Initial load: 1234ms
[Performance] Navigation to HomePage: 123ms
```

### Production Testing

Use browser DevTools:
1. Open DevTools → Performance tab
2. Record page load
3. Check metrics:
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Time to Interactive (TTI)

### Lighthouse Audit

Run Lighthouse audit for comprehensive performance analysis:

```bash
npm run build
npx serve -s dist
# Open Chrome DevTools → Lighthouse → Run audit
```

## Future Optimizations

Potential future improvements:
- Service worker caching strategies
- Image optimization and WebP format
- Prefetching for likely navigation paths
- Resource hints (preload, prefetch)
- HTTP/2 server push
- Tree shaking unused code

## Related Requirements

- **Property 84**: Initial load performance (< 2s)
- **Property 87**: Navigation performance (< 500ms)
- **Property 88**: Large thread pagination
