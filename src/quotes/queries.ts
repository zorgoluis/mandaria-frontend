export const quoteKeys = {
  all: ['delivery-quotes'] as const,
  list: (filters: object) => ['delivery-quotes', 'list', filters] as const,
  detail: (publicId: string) =>
    ['delivery-quotes', 'detail', publicId] as const,
  forRequest: (publicId: string, page: number) =>
    ['delivery-quotes', 'request', publicId, page] as const,
}
