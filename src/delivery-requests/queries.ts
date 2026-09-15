export const deliveryRequestKeys = {
  all: ['delivery-requests'] as const,
  list: (filters: object) => ['delivery-requests', 'list', filters] as const,
  count: (status: string) => ['delivery-requests', 'count', status] as const,
  detail: (publicId: string) =>
    ['delivery-requests', 'detail', publicId] as const,
}
