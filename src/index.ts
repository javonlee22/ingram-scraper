import * as puppeteer from "puppeteer"
import * as json2xls from "json2xls"
import { writeFileSync as writeFile } from "fs"
import * as dotenv from "dotenv"
dotenv.config({ path: __dirname + "/.env" })

interface Product {
  vpn: string
  msrp: number
  vendorPrice: number
  discount?: number
  stock: number
  sku: string
  upc: string
  shortDescription?: string
  longDescription?: string
}
;(async () => {
  const BASE_URL = "https://www.usa.ingrammicro.com/Site/home"

  const init: () => Promise<puppeteer.Browser> = async () => {
    return await puppeteer.launch({ headless: false, defaultViewport: null })
  }

  const login = async (browser: puppeteer.Browser) => {}

  const extractProducts: (
    browser: puppeteer.Browser
  ) => Promise<[Product] | []> = async (browser) => {
    return []
  }

  let browser: puppeteer.Browser = await init()
  await login(browser)
  let products = await extractProducts(browser)
  browser.close()
  const data: string = JSON.stringify(products)
  writeFile("products.json", data)
})()
