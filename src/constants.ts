import { SelectorMap } from "./types"
import dotenv from "dotenv"
dotenv.config()

export const EMAIL: string = process.env.EMAIL ?? ""
export const PASSWORD: string = process.env.PASSWORD ?? ""
export const BASE_URL: string = "https://usa.ingrammicro.com"
export const BASE_PRODUCT_URL = "https://usa.ingrammicro.com/Site/Search#"
export const productRowSelector = "div.row.product"

export const priceRegExp: RegExp = new RegExp(/^\d+\.?\d{0,2}$/)
export const integerRegExp: RegExp = new RegExp(/^[-+]?\d+$/)

export const selectorMap: SelectorMap = {
  productRow: productRowSelector,
  shortDescription: "a.js-adobe-tracking span",
  sku: ".sku",
  vpn: ".vpn",
  msrp: "p.msrp span.display-block",
  listPrice: "p.panda-price",
  upc: ".product.info.ean.show",
  stock: "a.stockinformation",
  url: "a.js-adobe-tracking",
}
