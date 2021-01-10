export interface Product {
  vpn: string
  msrp: number | string
  vendorPrice: number | string
  discount?: number
  stock: number | string
  sku: string
  upc: string
  shortDescription: string
  longDescription?: string
  url: string
}

export interface SelectorMap {
  productRow: string
  shortDescription: string
  sku: string
  vpn: string
  msrp: string
  listPrice: string
  upc: string
  stock: string
  url: string
}

export type ProductArrayPageFn = (selectorMap: SelectorMap) => Product[]
export type StringArrayPageFn = (selector: string) => string[]
