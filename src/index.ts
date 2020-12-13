import puppeteer from "puppeteer"
// import * as json2xls from "json2xls"
import { writeFileSync as writeFile } from "fs"
import dotenv from "dotenv"
dotenv.config()

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

type ProductRowPageFn = () => Element[]
;(async () => {
  const EMAIL = process.env.EMAIL ?? ""
  const PASSWORD = process.env.PASSWORD ?? ""

  if (EMAIL === "" || PASSWORD === "") {
    console.error("No username/password environment variables found.")
    process.exit(1)
  }

  const init: () => Promise<puppeteer.Browser> = async () => {
    return await puppeteer.launch({ headless: false, defaultViewport: null })
  }

  const login = async (page: puppeteer.Page) => {
    const usernameSelector = "#okta-signin-username"
    const passwordSelector = "#okta-signin-password"
    const submitSelector = "#okta-signin-submit"

    await page.goto("https://usa.ingrammicro.com/Site/Login", {
      waitUntil: "networkidle2",
    })
    await page.waitForSelector(usernameSelector)
    await page.click(usernameSelector)
    await page.keyboard.type(EMAIL)
    await page.click(passwordSelector)
    await page.keyboard.type(PASSWORD)
    await page.click(submitSelector)
    await page.waitForNavigation()
  }

  const extractProducts: (
    page: puppeteer.Page
  ) => Promise<[Product] | []> = async (page) => {
    const productRowSelector = "div.row.product"
    await page.goto("https://usa.ingrammicro.com/Site/Search#", {
      waitUntil: "networkidle2",
    })
    await page.waitForSelector(productRowSelector)
    let productRows = await page.evaluate<ProductRowPageFn>(() => {
      return Array.from(document.querySelectorAll(productRowSelector))
    })
    productRows.map<Product | {}>((element) => {
      return {}
    })
    await page.close()
    return []
  }

  let browser: puppeteer.Browser = await init()
  let page = await browser.newPage()
  await login(page)
  let products = await extractProducts(page)
  browser.close()
  const data: string = JSON.stringify(products)
  writeFile("products.json", data)
})()
